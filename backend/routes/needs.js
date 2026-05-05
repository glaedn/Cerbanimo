import express from 'express';
import pool from '../db.js'; // Assuming db.js is in the backend directory
import DiscordBotService from '../services/DiscordBotService.js';
import ProjectConversionService from '../services/ProjectConversionService.js';
import NeedService from '../services/NeedService.js';
import { sendNotification } from '../services/NotificationService.js';

const router = express.Router();

// POST /needs - Declare a new need
router.post('/', async (req, res) => {
  try {
    const newNeed = await NeedService.createNeed(req.body, req.user);

    // Broadcast to Discord if it's a community need
    if (newNeed.requestor_community_id) {
      DiscordBotService.broadcastNeed(newNeed)
        .then(() => DiscordBotService.matchAndPing(newNeed, 'need'))
        .catch(err => console.error('Discord broadcast/ping failed:', err));
    }

    res.status(201).json(newNeed);
  } catch (err) {
    console.error('Error creating need:', err);
    res.status(err.message.includes('required') || err.message.includes('must be provided') ? 400 : 500).json({ error: err.message });
  }
});

// GET /needs - Get all needs with optional filters
router.get('/', async (req, res) => {
  const { category, urgency, status } = req.query;
  let query = 'SELECT * FROM needs WHERE 1=1';
  const queryParams = [];
  let paramIndex = 1;

  if (category) {
    query += ` AND category = $${paramIndex++}`;
    queryParams.push(category);
  }
  if (urgency) {
    query += ` AND urgency = $${paramIndex++}`;
    queryParams.push(urgency);
  }
  if (status) {
    query += ` AND status = $${paramIndex++}`;
    queryParams.push(status);
  } else {
    // Default to open needs if no status filter is provided
    query += ` AND (status = 'open' OR status IS NULL)`; // Assuming NULL status also means open
  }

  query += ' ORDER BY created_at DESC'; // Default sort

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching needs:', err);
    res.status(500).json({ error: 'Failed to fetch needs' });
  }
});

// GET /needs/user/:userId - Get needs declared by a specific user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM needs WHERE requestor_user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user needs:', err);
    res.status(500).json({ error: 'Failed to fetch user needs' });
  }
});

// GET /needs/community/:communityId - Get needs declared by a specific community
router.get('/community/:communityId', async (req, res) => {
  const { communityId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM needs WHERE requestor_community_id = $1 ORDER BY created_at DESC', [communityId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching community needs:', err);
    res.status(500).json({ error: 'Failed to fetch community needs' });
  }
});

// GET /needs/:needId - Get details of a specific need
router.get('/:needId', async (req, res) => {
  const { needId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM needs WHERE id = $1', [needId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Need not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching need details:', err);
    res.status(500).json({ error: 'Failed to fetch need details' });
  }
});

// PUT /needs/:needId - Update an existing need
router.put('/:needId', async (req, res) => {
  const { needId } = req.params;
  const currentUserId = req.user.id;
  const {
    name,
    description,
    category,
    quantity_needed,
    urgency,
    urgency_level,
    is_recurring,
    recurrence_pattern,
    location,
    mobility_required,
    // requestor_user_id and requestor_community_id are generally not changed post-creation
    required_before_date,
    location_text,
    latitude,
    longitude,
    status
  } = req.body;

  if (!name) { // Basic validation
    return res.status(400).json({ error: 'Need name is required.' });
  }

  try {
    // First, fetch the need to check ownership/authorization
    const needResult = await pool.query('SELECT requestor_user_id, requestor_community_id FROM needs WHERE id = $1', [needId]);
    if (needResult.rows.length === 0) {
      return res.status(404).json({ error: 'Need not found' });
    }

    const need = needResult.rows[0];
    // TODO: Add more robust authorization check (e.g., community admin rights for community needs)
    if (need.requestor_user_id !== currentUserId && !need.requestor_community_id) { // Simple check for user-owned needs
      return res.status(403).json({ error: 'User not authorized to update this need.' });
    }

    if (status === 'fulfilled' && need.requestor_user_id !== currentUserId) {
      return res.status(403).json({ error: 'Only the need creator can mark it as fulfilled.' });
    }

    let fulfilled_at = null;
    let fulfilled_via = null;
    if (status === 'fulfilled') {
      fulfilled_at = new Date();
      fulfilled_via = 'web';
    }
    // If it's a community need (need.requestor_community_id is not null),
    // currentUserId should be an admin of that community. This logic needs to be implemented.
    // For now, only the original user requestor can update if it's not a community need.

    const updateQuery = `
      UPDATE needs 
      SET name = $1, description = $2, category = $3, quantity_needed = $4, urgency = $5,
          urgency_level = $6, is_recurring = $7, recurrence_pattern = $8, location = $9, mobility_required = $10,
          required_before_date = $11, location_text = $12, latitude = $13, longitude = $14, status = $15,
          fulfilled_at = COALESCE($16, fulfilled_at), fulfilled_via = COALESCE($17, fulfilled_via)
          -- updated_at is handled by the trigger
      WHERE id = $18
      RETURNING *
    `;
    const values = [
      name, description, category, quantity_needed, urgency,
      urgency_level, is_recurring, recurrence_pattern, location, mobility_required,
      required_before_date, location_text, latitude, longitude, status,
      fulfilled_at, fulfilled_via,
      needId
    ];

    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) { // Should not happen if previous check passed
      return res.status(404).json({ error: 'Need not found after update attempt' });
    }
    const updatedNeed = result.rows[0];

    // Sync update to Discord
    if (updatedNeed.discord_thread_id) {
      DiscordBotService.syncNeedUpdate(updatedNeed).catch(err => console.error('Discord sync failed:', err));
    }

    // Notify users who offered help about fulfillment
    if (status === 'fulfilled') {
      try {
        const commenters = await pool.query(
          "SELECT DISTINCT user_id FROM need_comments WHERE need_id = $1 AND content LIKE '%[OFFER]%'",
          [needId]
        );
        for (const row of commenters.rows) {
          if (row.user_id !== currentUserId) {
            sendNotification(row.user_id, {
              message: `The need "${updatedNeed.name}" you offered help for has been marked as fulfilled. Please verify completion.`,
              type: 'need_fulfilled',
              needId: needId
            }).catch(err => console.error('Failed to send fulfillment notification:', err));
          }
        }
      } catch (notifyErr) {
        console.error('Error fetching commenters for fulfillment notification:', notifyErr);
      }
    }

    res.json(updatedNeed);
  } catch (err) {
    console.error('Error updating need:', err);
    res.status(500).json({ error: 'Failed to update need' });
  }
});

// POST /needs/:needId/convert - Convert a need to a project
router.post('/:needId/convert', async (req, res) => {
  const { needId } = req.params;
  try {
    const project = await ProjectConversionService.convertNeedToProject(needId);
    res.status(201).json(project);
  } catch (err) {
    console.error(`Error converting need ${needId} to project:`, err);
    res.status(500).json({ error: 'Failed to convert need to project' });
  }
});

// DELETE /needs/:needId - Delete a need
router.delete('/:needId', async (req, res) => {
  const { needId } = req.params;
  const currentUserId = req.user.id;

  try {
    // First, fetch the need to check ownership/authorization
    const needResult = await pool.query('SELECT requestor_user_id, requestor_community_id FROM needs WHERE id = $1', [needId]);
    if (needResult.rows.length === 0) {
      return res.status(404).json({ error: 'Need not found' });
    }

    const need = needResult.rows[0];
    // TODO: Add more robust authorization check (e.g., community admin rights for community needs)
    if (need.requestor_user_id !== currentUserId && !need.requestor_community_id) { // Simple check for user-owned needs
      return res.status(403).json({ error: 'User not authorized to delete this need.' });
    }
    // If it's a community need, currentUserId should be an admin of that community. This logic needs to be implemented.

    const result = await pool.query('DELETE FROM needs WHERE id = $1 RETURNING *', [needId]);
    if (result.rowCount === 0) { // Should not happen if previous check passed
      return res.status(404).json({ error: 'Need not found for deletion' });
    }
    res.status(204).send(); // No Content
  } catch (err) {
    console.error('Error deleting need:', err);
    // Check for foreign key violation if any (e.g. if needs are linked to other tables like 'offers')
    if (err.code === '23503') { // PostgreSQL foreign key violation error code
        return res.status(409).json({ error: 'Cannot delete need as it is referenced by other entities.' });
    }
    res.status(500).json({ error: 'Failed to delete need' });
  }
});

export default router;
