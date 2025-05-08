import express from 'express';
import pg from 'pg';
import { autoGenerateTasks } from '../services/taskGenerator.js';

const { Pool } = pg;

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// Fetch all projects with optional search, pagination, and prioritizing user-created projects
router.get('/', async (req, res) => {
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
  
      // Fetch projects, prioritizing those created by the user
      const projectsQuery = `
        SELECT * FROM projects 
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
      const projectsResult = await pool.query(projectsQuery, [searchParam, userId, offset]);
  
      res.status(200).json(projectsResult.rows);
    } catch (err) {
      console.error('Error fetching projects:', err);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

// Fetch only user-created projects
router.get('/userprojects', async (req, res) => {
  try {
    const { userId = '', page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT * FROM projects
      WHERE creator_id = $1
      ORDER BY id ASC
      LIMIT $2 OFFSET $3
    `;
    const values = [userId, pageSize, offset];

    const result = await pool.query(query, values);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching user projects:', err);
    res.status(500).json({ message: 'Failed to fetch user projects' });
  }
});

// Fetch a project by ID
router.get('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await pool.query(query, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// Update project tags
router.patch('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { tags } = req.body;

  try {
    const query = 'UPDATE projects SET tags = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [tags, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project tags:', error);
    res.status(500).json({ message: 'Failed to update project tags' });
  }
});

// Create a new project
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

    // Step 2: Insert the new project with the derived creator_id
    const insertQuery = `
      INSERT INTO projects (name, description, tags, creator_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [name, description, tags, creator_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Update an existing project
router.put('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { name, description, tags } = req.body;

  if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
  }

  try {
      await pool.query(
          `UPDATE projects 
          SET name = $1, description = $2, tags = $3 
          WHERE id = $4`,
          [name, description, tags, projectId]
      );
      res.status(200).json({ message: 'Project updated successfully' });
  } catch (error) {
      console.error('Failed to update project:', error);
      res.status(500).json({ error: 'Failed to update project' });
  }
});

//import and export functions
// Export project + tasks as JSON
router.get('/:projectId/export', async (req, res) => {
  const { projectId } = req.params;
  try {
    // Fetch project
    const projectQuery = 'SELECT * FROM projects WHERE id = $1';
    const projectResult = await pool.query(projectQuery, [projectId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Fetch tasks
    const tasksQuery = 'SELECT * FROM tasks WHERE project_id = $1';
    const tasksResult = await pool.query(tasksQuery, [projectId]);

    const exportData = {
      project: {
        name: project.name,
        description: project.description,
        tags: project.tags,
        token_pool: project.token_pool,
        used_tokens: project.used_tokens,
        reserved_tokens: project.reserved_tokens
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
    console.error('Error exporting project:', error);
    res.status(500).json({ message: 'Failed to export project' });
  }
});


// Import project + tasks from JSON
router.post('/import', async (req, res) => {
  const { project, tasks, auth0_id } = req.body; // JSON must include auth0_id to assign creator

  if (!project || !tasks || !auth0_id) {
    return res.status(400).json({ message: 'Project, tasks, and auth0_id are required' });
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

    // Insert new project
    const projectInsertQuery = `
      INSERT INTO projects (name, description, tags, creator_id, token_pool, used_tokens, reserved_tokens)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const projectResult = await client.query(projectInsertQuery, [
      project.name, project.description, project.tags, creator_id,
      project.token_pool, project.used_tokens, project.reserved_tokens
    ]);
    const newProjectId = projectResult.rows[0].id;

    // Map template task "index" to new database task IDs
    const taskIdMap = {}; // { templateIndex: newId }

    // First pass — create all tasks (without dependencies yet)
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const insertTaskQuery = `
        INSERT INTO tasks (name, description, project_id, creator_id, reward_tokens, status, skill_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `;
      const taskResult = await client.query(insertTaskQuery, [
        task.name, task.description, newProjectId, creator_id,
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
    res.status(201).json({ message: 'Project imported successfully', projectId: newProjectId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing project:', error);
    res.status(500).json({ message: 'Failed to import project' });
  } finally {
    client.release();
  }
});

router.post('/auto-generate', async (req, res) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Missing projectId' });
  }

  try {
    // 1. Fetch project details
    const projectResult = await pool.query('SELECT name, description FROM projects WHERE id = $1', [projectId]);
    const project = projectResult.rows[0];

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // 2. Generate tasks using LLM
    const tasks = await autoGenerateTasks(project.name, project.description);
    console.log('Generated tasks:', tasks);

    // 3. First pass: Insert tasks WITHOUT dependencies, and build LLM ID → DB ID map
    const llmToDbIdMap = {};

    for (const task of tasks) {
      const result = await pool.query(
        'INSERT INTO tasks (project_id, name, description, skill_id, status, dependencies, reward_tokens) VALUES ($1, $2, $3, $4, $5, $6::int[], $7) RETURNING id',
        [projectId, task.name, task.description, task.skill_id, 'inactive-unassigned', [], task.reward_tokens] 
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




export default router;