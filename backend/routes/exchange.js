// backend/routes/exchange.js
import express from 'express';
import { initiateExchange } from '../services/resourceExchangeService.js';
import { awardTokens } from '../services/tokenService.js';
import authenticate from '../middlewares/authenticate.js';
import db from '../db.js'; // Database pool

const router = express.Router();

// POST /initiate - Initiate a resource exchange
router.post('/initiate', async (req, res) => {
  const { needId, resourceId, notes } = req.body;
  const loggedInUserId = req.user.id; // Provided by the resolveUser middleware

  if (!needId || !resourceId) {
    return res.status(400).json({ message: 'needId and resourceId are required in the request body.' });
  }

  try {
    const result = await initiateExchange({ needId, resourceId, loggedInUserId, notes }, db);
    res.status(201).json(result);
  } catch (error) {
    console.error(`Exchange initiation failed for NeedID: ${needId}, ResourceID: ${resourceId} by UserID: ${loggedInUserId}:`, error.message);

    if (error.message.toLowerCase().includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.toLowerCase().includes('no longer open') || error.message.toLowerCase().includes('no longer available')) {
      return res.status(409).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to initiate exchange due to an internal server error.' });
  }
});

// POST /exchange/confirm_pickup/:taskId 
router.post('/confirm_pickup/:taskId', authenticate, async (req, res) => {
  const { taskId } = req.params;
  try {
    await db.query('UPDATE coordination_tasks SET status = $1, updated_at = NOW() WHERE id = $2', ['picked_up', taskId]);
    res.json({ success: true, message: 'Pickup confirmed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /exchange/confirm_delivery/:taskId
router.post('/confirm_delivery/:taskId', authenticate, async (req, res) => {
  const { taskId } = req.params;
  try {
    await db.query('UPDATE coordination_tasks SET status = $1, updated_at = NOW() WHERE id = $2', ['delivered', taskId]);
    res.json({ success: true, message: 'Delivery confirmed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /exchange/verify_exchange/:taskId
router.post('/verify_exchange/:taskId', authenticate, async (req, res) => {
  const { taskId } = req.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const taskRes = await client.query('SELECT * FROM coordination_tasks WHERE id = $1', [taskId]);
    if (taskRes.rows.length === 0) throw new Error('Task not found');
    const task = taskRes.rows[0];

    // Update statuses
    await client.query('UPDATE coordination_tasks SET status = $1, updated_at = NOW() WHERE id = $2', ['completed', taskId]);
    if (task.need_id) await client.query('UPDATE needs SET status = $1 WHERE id = $2', ['fulfilled', task.need_id]);
    if (task.resource_id) await client.query('UPDATE resources SET status = $1 WHERE id = $2', ['exchanged', task.resource_id]);

    // Trigger reward if applicable
    if (task.reward_amount && task.contributor_id) {
       await awardTokens(db, task.contributor_id, task.reward_amount, `Exchange completed: Task ${taskId}`);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Exchange verified and completed' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST /exchange/cancel/:taskId
router.post('/cancel/:taskId', authenticate, async (req, res) => {
  const { taskId } = req.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const taskRes = await client.query('SELECT * FROM coordination_tasks WHERE id = $1', [taskId]);
    const task = taskRes.rows[0];

    await client.query('UPDATE coordination_tasks SET status = $1, updated_at = NOW() WHERE id = $2', ['cancelled', taskId]);
    if (task.need_id) await client.query('UPDATE needs SET status = $1 WHERE id = $2', ['open', task.need_id]);
    if (task.resource_id) await client.query('UPDATE resources SET status = $1 WHERE id = $2', ['available', task.resource_id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Exchange cancelled' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});


export default router;
