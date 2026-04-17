import express from 'express';
import pool from '../db.js';

const router = express.Router();

/**
 * POST /services/:projectId/purchase
 * Flow:
 * 1. Validate project is a service.
 * 2. Deduct service_price from buyer's community tokens in token_ledger.
 * 3. Create a new project instance for the buyer.
 * 4. Copy tasks from the service template to the new project.
 */
router.post('/:projectId/purchase', async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body; // Internal user ID of the buyer

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch the service project details
    const serviceQuery = 'SELECT * FROM projects WHERE id = $1';
    const serviceResult = await client.query(serviceQuery, [projectId]);

    if (serviceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Service project not found' });
    }

    const service = serviceResult.rows[0];

    if (!service.is_service) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This project is not designated as a service' });
    }

    const price = service.service_price || 0;
    const communityId = service.community_id;

    if (!communityId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Service must be associated with a community' });
    }

    // 2. Verify and deduct community tokens from buyer
    const userQuery = 'SELECT token_ledger FROM users WHERE id = $1 FOR UPDATE';
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    const ledger = user.token_ledger || [];

    // Calculate current community balance
    let communityBalance = 0;
    ledger.forEach(entry => {
        const record = typeof entry === 'string' ? JSON.parse(entry) : entry;
        if (record.type === 'community' && record.id === communityId) {
            communityBalance += record.tokens || 0;
        }
    });

    if (communityBalance < price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient community tokens' });
    }

    // Deduct price by appending to ledger
    const deductionEntry = {
      type: 'community',
      id: communityId,
      tokens: -price,
      reason: `Purchase of service: ${service.name}`,
      creationDate: new Date()
    };

    await client.query(
      'UPDATE users SET token_ledger = array_append(token_ledger, $1::jsonb) WHERE id = $2',
      [JSON.stringify(deductionEntry), userId]
    );

    // Also record in token_transactions if desired (optional based on schema)
    const transactionQuery = `
      INSERT INTO token_transactions (sender_id, receiver_id, amount, reason, transaction_date)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    // receiver_id could be the service creator or a community pool;
    // the prompt says "Tokens go into: project token_pool" of the NEW instance.
    await client.query(transactionQuery, [userId, service.creator_id, price, `Purchase service ${projectId}`]);

    // 3. Create a new project instance for the buyer
    const newProjectInsert = `
      INSERT INTO projects (name, description, tags, creator_id, community_id, token_pool, is_service)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING id;
    `;
    const newProjectResult = await client.query(newProjectInsert, [
      service.name,
      service.description,
      service.tags,
      userId,
      communityId,
      price // "Tokens go into: project token_pool"
    ]);
    const newProjectId = newProjectResult.rows[0].id;

    // 4. Copy tasks from the service template
    const tasksQuery = 'SELECT * FROM tasks WHERE project_id = $1';
    const tasksResult = await client.query(tasksQuery, [projectId]);
    const templateTasks = tasksResult.rows;

    const taskIdMap = {}; // { templateTaskId: newTaskId }

    // First pass: Create tasks without dependencies
    for (const t of templateTasks) {
      const taskInsert = `
        INSERT INTO tasks (name, description, project_id, creator_id, skill_id, skill_level, reward_tokens, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'inactive-unassigned')
        RETURNING id;
      `;
      const newTaskResult = await client.query(taskInsert, [
        t.name,
        t.description,
        newProjectId,
        userId,
        t.skill_id,
        t.skill_level,
        t.reward_tokens,
      ]);
      taskIdMap[t.id] = newTaskResult.rows[0].id;
    }

    // Second pass: Update dependencies
    for (const t of templateTasks) {
      if (t.dependencies && t.dependencies.length > 0) {
        const newDeps = t.dependencies.map(oldId => taskIdMap[oldId]).filter(id => id !== undefined);
        if (newDeps.length > 0) {
          await client.query('UPDATE tasks SET dependencies = $1 WHERE id = $2', [newDeps, taskIdMap[t.id]]);
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Service purchased successfully',
      projectId: newProjectId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing service:', error);
    res.status(500).json({ message: 'Failed to purchase service' });
  } finally {
    client.release();
  }
});

export default router;
