import express from 'express';
import pool from '../db.js';
import jwtCheck from '../middlewares/authenticate.js';

const router = express.Router();

// Get services for a user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `
      SELECT * FROM projects
      WHERE creator_id = $1 AND is_service = TRUE AND 'profile' = ANY(service_visibility)
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user services:', error);
    res.status(500).json({ message: 'Failed to fetch services' });
  }
});

// Get services for a community
router.get('/community/:communityId', async (req, res) => {
  const { communityId } = req.params;
  try {
    const query = `
      SELECT * FROM projects
      WHERE is_service = TRUE AND $1 = ANY(service_visibility)
    `;
    const result = await pool.query(query, [`community:${communityId}`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching community services:', error);
    res.status(500).json({ message: 'Failed to fetch services' });
  }
});

// Purchase a service project
router.post('/:projectId/purchase', async (req, res) => {
  const { projectId } = req.params;
  const auth0Id = req.auth?.payload?.sub;

  if (!auth0Id) {
    return res.status(401).json({ message: 'Unauthorized: No Auth0 ID found' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the buyer's internal user ID and username
    const userQuery = 'SELECT id, username, token_ledger FROM users WHERE auth0_id = $1';
    const userResult = await client.query(userQuery, [auth0Id]);
    const buyer = userResult.rows[0];

    if (!buyer) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // 2. Get the service project details
    const projectQuery = 'SELECT * FROM projects WHERE id = $1 AND is_service = TRUE';
    const projectResult = await client.query(projectQuery, [projectId]);
    const serviceProject = projectResult.rows[0];

    if (!serviceProject) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Service project not found or not marked as a service' });
    }

    const price = serviceProject.service_price || 0;

    // 3. Simple token check/deduction (assuming Galactic Credits for now)
    // In a real scenario, we might want to check community-specific tokens in token_ledger
    // but the task description implies a more general purchase flow for now.
    // Let's use cotokens as the currency.

    const buyerCotokens = await client.query('SELECT cotokens FROM users WHERE id = $1', [buyer.id]);
    if (buyerCotokens.rows[0].cotokens < price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient Galactic Credits' });
    }

    // Deduct from buyer
    await client.query('UPDATE users SET cotokens = cotokens - $1 WHERE id = $2', [price, buyer.id]);

    // Add to seller (optional, but good practice)
    await client.query('UPDATE users SET cotokens = cotokens + $1 WHERE id = $2', [price, serviceProject.creator_id]);

    // 4. Create a new project instance for the buyer
    const newProjectQuery = `
      INSERT INTO projects (name, description, tags, creator_id, token_pool, used_tokens, reserved_tokens)
      VALUES ($1, $2, $3, $4, $5, 0, 0)
      RETURNING id;
    `;
    const newProjectResult = await client.query(newProjectQuery, [
      `${buyer.username}'s ${serviceProject.name}`,
      serviceProject.description,
      serviceProject.tags,
      buyer.id,
      price // The price becomes the token pool for the new project
    ]);
    const newProjectId = newProjectResult.rows[0].id;

    // 5. Clone all tasks
    const tasksQuery = 'SELECT * FROM tasks WHERE project_id = $1';
    const tasksResult = await client.query(tasksQuery, [projectId]);
    const templateTasks = tasksResult.rows;

    const taskIdMap = {}; // { oldTaskId: newTaskId }

    // First pass: Create tasks without dependencies
    for (const task of templateTasks) {
      const insertTaskQuery = `
        INSERT INTO tasks (name, description, project_id, skill_id, status, reward_tokens, skill_level)
        VALUES ($1, $2, $3, $4, 'inactive-unassigned', $5, $6)
        RETURNING id;
      `;
      const taskResult = await client.query(insertTaskQuery, [
        task.name,
        task.description,
        newProjectId,
        task.skill_id,
        task.reward_tokens,
        task.skill_level
      ]);
      taskIdMap[task.id] = taskResult.rows[0].id;
    }

    // Second pass: Update dependencies
    for (const task of templateTasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        const newTaskId = taskIdMap[task.id];
        const newDeps = task.dependencies
          .map(oldDepId => taskIdMap[oldDepId])
          .filter(Boolean);

        if (newDeps.length > 0) {
          await client.query('UPDATE tasks SET dependencies = $1 WHERE id = $2', [newDeps, newTaskId]);
        }
      }
    }

    // 6. Record transaction in token_ledger for both
    const buyerTransaction = JSON.stringify({
      type: 'service_purchase',
      projectId: newProjectId,
      templateProjectId: projectId,
      tokens: -price,
      creationDate: new Date()
    });
    const sellerTransaction = JSON.stringify({
      type: 'service_sale',
      projectId: projectId,
      buyerId: buyer.id,
      tokens: price,
      creationDate: new Date()
    });

    await client.query('UPDATE users SET token_ledger = array_append(COALESCE(token_ledger, \'{}\'), $1::jsonb) WHERE id = $2', [buyerTransaction, buyer.id]);
    await client.query('UPDATE users SET token_ledger = array_append(COALESCE(token_ledger, \'{}\'), $1::jsonb) WHERE id = $2', [sellerTransaction, serviceProject.creator_id]);

    // 7. Send notification to seller
    const io = req.app.get('io');
    const notificationMessage = JSON.stringify({
      text: `${buyer.username} has purchased your service: ${serviceProject.name}!`,
      projectId: newProjectId,
      buyerId: buyer.id,
      buyerUsername: buyer.username,
      serviceName: serviceProject.name
    });

    const notificationResult = await client.query(
      'INSERT INTO notifications (user_id, message, type, created_at, read) VALUES ($1, $2, $3, NOW(), false) RETURNING *',
      [serviceProject.creator_id, notificationMessage, 'service_purchase']
    );

    if (io) {
      io.to(`user_${serviceProject.creator_id}`).emit('notification', notificationResult.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Service purchased successfully', projectId: newProjectId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing service:', error);
    res.status(500).json({ message: 'Failed to purchase service' });
  } finally {
    client.release();
  }
});

export default router;
