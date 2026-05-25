import express from 'express';
import pool from '../db.js';
import ResourceService from '../services/ResourceService.js';
import IntegrationManager from '../services/integrations/core/IntegrationManager.js';
import { applyBurn } from '../utils/burnUtils.js';

const router = express.Router();

router.get('/inventory/:userId', async (req, res) => {
  try {
    const resources = await ResourceService.getResourceInventory(req.params.userId);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/community/:communityId', async (req, res) => {
  try {
    const resources = await ResourceService.getCommunityResources(req.params.communityId);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add', async (req, res) => {
  const { ownerUserId, ownerCommunityId, name, description, category, condition, quantity, unit, skillIds, locationText, resourceType, availabilitySchedule, conditions, latitude, longitude, price } = req.body;
  try {
    const resource = await ResourceService.addResource(ownerUserId, ownerCommunityId, name, description, category, condition, quantity, unit, 'available', skillIds, locationText, resourceType, availabilitySchedule, conditions, latitude, longitude, price);

    // Broadcast to connected platforms if it's a community resource
    if (resource.owner_community_id) {
        IntegrationManager.broadcast(resource.owner_community_id, 'resource', resource)
          .catch(err => console.error('Community resource broadcast failed:', err));
    }

    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/allocate', async (req, res) => {
  const { resourceId, taskId, userId, startTime, endTime } = req.body;
  try {
    const allocation = await ResourceService.allocateResource(resourceId, taskId, userId, startTime, endTime);
    res.status(201).json(allocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/catalog', async (req, res) => {
  const { category, search, resource_type, required_at } = req.query;
  try {
    const resources = await ResourceService.getAllResources({ category, search, resource_type, required_at });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedule/:userId', async (req, res) => {
  try {
    const schedule = await ResourceService.getBookingSchedule(req.params.userId);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conflicts/:userId', async (req, res) => {
  try {
    const conflicts = await ResourceService.getConflicts(req.params.userId);
    res.json(conflicts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conflicts/:conflictId/resolve', async (req, res) => {
  const { winningAllocationId, resolutionText } = req.body;
  try {
    const result = await ResourceService.resolveConflict(req.params.conflictId, winningAllocationId, resolutionText);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/inventory/:id', async (req, res) => {
  const { name, description, category, condition, quantity, unit, status, skillIds, locationText, resourceType, availabilitySchedule, conditions, latitude, longitude, price } = req.body;
  try {
    const result = await ResourceService.updateResource(req.params.id, { name, description, category, condition, quantity, unit, status, skillIds, locationText, resourceType, availabilitySchedule, conditions, latitude, longitude, price });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inventory/:id', async (req, res) => {
  try {
    const result = await ResourceService.deleteResource(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purchase a resource
router.post('/:resourceId/purchase', async (req, res) => {
  const { resourceId } = req.params;
  const auth0Id = req.auth?.payload?.sub;

  if (!auth0Id) {
    return res.status(401).json({ message: 'Unauthorized: No Auth0 ID found' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the buyer's internal user ID and username
    const userQuery = 'SELECT id, username, cotokens FROM users WHERE auth0_id = $1';
    const userResult = await client.query(userQuery, [auth0Id]);
    const buyer = userResult.rows[0];

    if (!buyer) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // 2. Get the resource details
    const resourceQuery = 'SELECT * FROM resources WHERE id = $1';
    const resourceResult = await client.query(resourceQuery, [resourceId]);
    const resource = resourceResult.rows[0];

    if (!resource) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Resource not found' });
    }

    const price = resource.price || 0;
    if (price <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This resource is not for sale' });
    }

    if (buyer.cotokens < price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient Galactic Credits' });
    }

    // Record Burn
    const burnAmount = await applyBurn(
      client,
      price,
      'resource_exchange',
      resource.id,
      'user',
      buyer.id,
      resource.owner_community_id
    );
    const sellerAmount = price - burnAmount;

    // Deduct from buyer
    await client.query('UPDATE users SET cotokens = cotokens - $1 WHERE id = $2', [price, buyer.id]);

    // Add to seller (with burn applied)
    await client.query('UPDATE users SET cotokens = cotokens + $1 WHERE id = $2', [sellerAmount, resource.owner_user_id]);

    // 3. Update resource ownership or mark as exchanged?
    // The requirement says "Resources that are on user's profiles for a price"
    // Usually a purchase means it changes owner or a copy is made.
    // For simplicity, let's change the owner and mark as exchanged or available for the new owner.
    await client.query('UPDATE resources SET owner_user_id = $1, status = \'available\' WHERE id = $2', [buyer.id, resourceId]);

    // 4. Record transaction in token_ledger for both
    const buyerTransaction = JSON.stringify({
      type: 'resource_purchase',
      resourceId: resource.id,
      resourceName: resource.name,
      tokens: -price,
      creationDate: new Date()
    });
    const sellerTransaction = JSON.stringify({
      type: 'resource_sale',
      resourceId: resource.id,
      resourceName: resource.name,
      buyerId: buyer.id,
      tokens: price,
      creationDate: new Date()
    });

    await client.query('UPDATE users SET token_ledger = array_append(COALESCE(token_ledger, \'{}\'), $1::jsonb) WHERE id = $2', [buyerTransaction, buyer.id]);
    await client.query('UPDATE users SET token_ledger = array_append(COALESCE(token_ledger, \'{}\'), $1::jsonb) WHERE id = $2', [sellerTransaction, resource.owner_user_id]);

    // 5. Send notification to seller
    const io = req.app.get('io');
    const notificationMessage = JSON.stringify({
      text: `${buyer.username} has purchased your resource: ${resource.name}!`,
      resourceId: resource.id,
      buyerId: buyer.id,
      buyerUsername: buyer.username,
      resourceName: resource.name
    });

    const notificationResult = await client.query(
      'INSERT INTO notifications (user_id, message, type, created_at, read) VALUES ($1, $2, $3, NOW(), false) RETURNING *',
      [resource.owner_user_id, notificationMessage, 'resource_purchase']
    );

    if (io) {
      io.to(`user_${resource.owner_user_id}`).emit('notification', notificationResult.rows[0]);
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Resource purchased successfully', resourceId: resource.id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing resource:', error);
    res.status(500).json({ message: 'Failed to purchase resource' });
  } finally {
    client.release();
  }
});

export default router;
