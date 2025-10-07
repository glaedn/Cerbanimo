import express from 'express';
import pg from 'pg';
import { autoGenerateTasks } from '../services/taskGenerator.js';

const { Pool } = pg;

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM intentions');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching intentions:', err);
    res.status(500).json({ message: 'Failed to fetch intentions' });
  }
});

// Fetch all intentions with optional search, pagination, and prioritizing user-created intentions
router.get('/personal', async (req, res) => {
    const { search = '', page = 1, auth0Id = '' } = req.query;

    try {
      // Get the internal user ID from the Auth0 ID
      const userQuery = `
        SELECT id FROM users WHERE auth0_id = $1
      `;
      const userResult = await pool.query(userQuery, [auth0Id]);
      const userId = userResult.rows[0]?.id || null;

      if (!userId) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Fetch intentions, prioritizing those created by the user
      const intentionsQuery = `
        SELECT * FROM intentions
        WHERE
          LOWER(name) LIKE LOWER($1) OR
          LOWER(description) LIKE LOWER($1)
        ORDER BY
          (CASE WHEN creator_id = $2 THEN 0 ELSE 1 END),
          id ASC
        LIMIT 10 OFFSET $3
      `;
      const offset = (page - 1) * 10;
      const searchParam = `%${search}%`;
      const intentionsResult = await pool.query(intentionsQuery, [searchParam, userId, offset]);

      res.status(200).json(intentionsResult.rows);
    } catch (err) {
      console.error('Error fetching intentions:', err);
      res.status(500).json({ message: 'Failed to fetch intentions' });
    }
  });

// Fetch "near" intentions (from user's realms, excluding their own)
router.get('/near', async (req, res) => {
  const { auth0Id } = req.query;

  if (!auth0Id) {
    return res.status(400).json({ message: 'Auth0 ID is required' });
  }

  try {
    // Get internal user ID from Auth0 ID
    const userResult = await pool.query('SELECT id FROM users WHERE auth0_id = $1', [auth0Id]);
    const userId = userResult.rows[0]?.id;

    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch intentions from realms the user is a member of, excluding their own intentions, and include resonance score
    const query = `
      SELECT i.*, COUNT(r.id) as resonance_score
      FROM intentions i
      LEFT JOIN resonances r ON i.id = r.intention_id
      WHERE i.realm_id IN (SELECT realm_id FROM realm_members WHERE user_id = $1)
      AND i.creator_id != $1
      GROUP BY i.id
      ORDER BY resonance_score DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching near intentions:', err);
    res.status(500).json({ message: 'Failed to fetch near intentions' });
  }
});

// Fetch only user-created intentions
router.get('/userintentions', async (req, res) => {
  try {
    const { userId = '', page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT * FROM intentions
      WHERE creator_id = $1
      ORDER BY id ASC
      LIMIT $2 OFFSET $3
    `;
    const values = [userId, pageSize, offset];

    const result = await pool.query(query, values);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching user intentions:', err);
    res.status(500).json({ message: 'Failed to fetch user intentions' });
  }
});

// Fetch a intention by ID
router.get('/:intentionId', async (req, res) => {
  const { intentionId } = req.params;
  try {
    const query = 'SELECT * FROM intentions WHERE id = $1';
    const result = await pool.query(query, [intentionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Intention not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching intention:', error);
    res.status(500).json({ message: 'Failed to fetch intention' });
  }
});

// Update intention tags
router.patch('/:intentionId', async (req, res) => {
  const { intentionId } = req.params;
  const { tags } = req.body;

  try {
    const query = 'UPDATE intentions SET tags = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [tags, intentionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Intention not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating intention tags:', error);
    res.status(500).json({ message: 'Failed to update intention tags' });
  }
});

// Create a new intention
router.post('/create', async (req, res) => {
  try {
    const { name, description, auth0_id } = req.body;
    const tags = req.body.tags.map(tag => tag.name);

    if (!name || !description || !auth0_id) {
      return res.status(400).json({ message: 'Name, description, and Auth0 ID are required' });
    }

    // Step 1: Fetch the internal user ID from the Auth0 ID
    const userQuery = `
      SELECT id FROM users WHERE auth0_id = $1
    `;
    const userResult = await pool.query(userQuery, [auth0_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const creator_id = userResult.rows[0].id;

    // Step 2: Insert the new intention with the derived creator_id
    const insertQuery = `
      INSERT INTO intentions (name, description, tags, creator_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [name, description, tags, creator_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating intention:', err);
    res.status(500).json({ message: 'Failed to create intention' });
  }
});

// Update an existing intention
router.put('/:intentionId', async (req, res) => {
  const { intentionId } = req.params;
  const { name, description, tags } = req.body;

  if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
  }

  try {
      await pool.query(
          `UPDATE intentions
          SET name = $1, description = $2, tags = $3
          WHERE id = $4`,
          [name, description, tags, intentionId]
      );
      res.status(200).json({ message: 'Intention updated successfully' });
  } catch (error) {
      console.error('Failed to update intention:', error);
      res.status(500).json({ error: 'Failed to update intention' });
  }
});

//import and export functions
// Export intention + tasks as JSON
router.get('/:intentionId/export', async (req, res) => {
  const { intentionId } = req.params;
  try {
    // Fetch intention
    const intentionQuery = 'SELECT * FROM intentions WHERE id = $1';
    const intentionResult = await pool.query(intentionQuery, [intentionId]);

    if (intentionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Intention not found' });
    }

    const intention = intentionResult.rows[0];

    // Fetch tasks
    const tasksQuery = 'SELECT * FROM tasks WHERE intention_id = $1';
    const tasksResult = await pool.query(tasksQuery, [intentionId]);

    const exportData = {
      intention: {
        name: intention.name,
        description: intention.description,
        tags: intention.tags,
        token_pool: intention.token_pool,
        used_tokens: intention.used_tokens,
        reserved_tokens: intention.reserved_tokens
      },
      tasks: tasksResult.rows.map(task => ({
        name: task.name,
        description: task.description,
        reward_tokens: task.reward_tokens,
        status: task.status,
        dependencies: task.dependencies,
        skill_id: task.skill_id
      }))
    };

    res.status(200).json(exportData);
  } catch (error) {
    console.error('Error exporting intention:', error);
    res.status(500).json({ message: 'Failed to export intention' });
  }
});


// Import intention + tasks from JSON
router.post('/import', async (req, res) => {
  const { intention, tasks, auth0_id } = req.body; // JSON must include auth0_id to assign creator

  if (!intention || !tasks || !auth0_id) {
    return res.status(400).json({ message: 'Intention, tasks, and auth0_id are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get internal user ID
    const userQuery = 'SELECT id FROM users WHERE auth0_id = $1';
    const userResult = await client.query(userQuery, [auth0_id]);
    const creator_id = userResult.rows[0]?.id;

    if (!creator_id) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }

    // Insert new intention
    const intentionInsertQuery = `
      INSERT INTO intentions (name, description, tags, creator_id, token_pool, used_tokens, reserved_tokens)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const intentionResult = await client.query(intentionInsertQuery, [
      intention.name, intention.description, intention.tags, creator_id,
      intention.token_pool, intention.used_tokens, intention.reserved_tokens
    ]);
    const newIntentionId = intentionResult.rows[0].id;

    // Map template task "index" to new database task IDs
    const taskIdMap = {}; // { templateIndex: newId }

    // First pass — create all tasks (without dependencies yet)
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const insertTaskQuery = `
        INSERT INTO tasks (name, description, intention_id, creator_id, reward_tokens, status, skill_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `;
      const taskResult = await client.query(insertTaskQuery, [
        task.name, task.description, newIntentionId, creator_id,
        task.reward_tokens, task.status, task.skill_id
      ]);
      taskIdMap[i] = taskResult.rows[0].id;
    }

    // Second pass — update dependencies with new IDs
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const newTaskId = taskIdMap[i];

      if (task.dependencies && task.dependencies.length > 0) {
        const remappedDependencies = task.dependencies.map(depIndex => taskIdMap[depIndex]);

        const updateDepsQuery = `
          UPDATE tasks SET dependencies = $1 WHERE id = $2
        `;
        await client.query(updateDepsQuery, [remappedDependencies, newTaskId]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Intention imported successfully', intentionId: newIntentionId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing intention:', error);
    res.status(500).json({ message: 'Failed to import intention' });
  } finally {
    client.release();
  }
});

router.post('/auto-generate', async (req, res) => {
  const { intentionId } = req.body;

  if (!intentionId) {
    return res.status(400).json({ success: false, error: 'Missing intentionId' });
  }

  try {
    // 1. Fetch intention details
    const intentionResult = await pool.query('SELECT name, description FROM intentions WHERE id = $1', [intentionId]);
    const intention = intentionResult.rows[0];

    if (!intention) {
      return res.status(404).json({ success: false, error: 'Intention not found' });
    }

    // 2. Generate tasks using LLM
    const generatedData = await autoGenerateTasks(intention.name, intention.description);
    console.log('Generated data:', generatedData);
    const tasks = generatedData.tasks
    console.log('Generated tasks:', tasks);

    // 3. First pass: Insert tasks WITHOUT dependencies, and build LLM ID → DB ID map
    const llmToDbIdMap = {};

    for (const task of tasks) {
      const result = await pool.query(
        'INSERT INTO tasks (intention_id, name, description, skill_id, status, dependencies, reward_tokens) VALUES ($1, $2, $3, $4, $5, $6::int[], $7) RETURNING id',
        [intentionId, task.name, task.description, task.skill_id, 'inactive-unassigned', [], task.reward_tokens]
      );
      const dbId = result.rows[0].id;
      llmToDbIdMap[task.id] = dbId;
    }

    // 4. Second pass: Update dependencies with resolved DB IDs
    const updatePromises = tasks.map(task => {
      const resolvedDeps = (Array.isArray(task.dependencies) ? task.dependencies : []).map(depId => llmToDbIdMap[depId]);
      return pool.query(
        'UPDATE tasks SET dependencies = $1::int[] WHERE id = $2',
        [resolvedDeps, llmToDbIdMap[task.id]]
      );
    });

    await Promise.all(updatePromises);

    // 5. Respond with success and DB task IDs
    const insertedTasks = tasks.map(task => ({
      ...task,
      db_id: llmToDbIdMap[task.id], // Optional: return DB IDs alongside LLM task data
      resolvedDependencies: (Array.isArray(task.dependencies) ? task.dependencies : []).map(depId => llmToDbIdMap[depId])
    }));

    res.json({ success: true, tasks: insertedTasks });
  } catch (error) {
    console.error('Auto-generate tasks failed:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Resonate with an intention
router.post('/:intentionId/resonate', async (req, res) => {
  const { intentionId } = req.params;
  const { userId } = req.body;
  try {
    const query = 'INSERT INTO resonances (user_id, intention_id) VALUES ($1, $2) ON CONFLICT (user_id, intention_id) DO NOTHING RETURNING *';
    const result = await pool.query(query, [userId, intentionId]);
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'User has already resonated with this intention.' });
    }
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating resonance:', error);
    res.status(500).json({ message: 'Failed to create resonance' });
  }
});

// Get resonance data for an intention
router.get('/:intentionId/resonances', async (req, res) => {
  const { intentionId } = req.params;
  const { userId } = req.query;
  try {
    const countQuery = 'SELECT COUNT(*) FROM resonances WHERE intention_id = $1';
    const countResult = await pool.query(countQuery, [intentionId]);
    const count = parseInt(countResult.rows[0].count, 10);

    let userHasResonated = false;
    if (userId) {
      const userQuery = 'SELECT * FROM resonances WHERE user_id = $1 AND intention_id = $2';
      const userResult = await pool.query(userQuery, [userId, intentionId]);
      userHasResonated = userResult.rows.length > 0;
    }

    res.status(200).json({ count, userHasResonated });
  } catch (error) {
    console.error('Error fetching resonance data:', error);
    res.status(500).json({ message: 'Failed to fetch resonance data' });
  }
});


export default router;