import express from 'express';
import pg from 'pg';

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

// Create a new project
router.post('/create', async (req, res) => {
  try {
    const { name, description, tags, auth0_id } = req.body;

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



export default router;