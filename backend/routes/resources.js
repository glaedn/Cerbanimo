import express from 'express';
import pool from '../db.js';  // Assuming db.js is in the backend directory
import authenticate from '../middlewares/authenticate.js';  // Assuming middleware is in backend/middleware

const router = express.Router();

// POST /resources - Create a new resource
router.post('/', authenticate, async (req, res) => {
  const payload = req.body;
  
  // Destructure with defaults from the payload
  const {
    name,
    description = null,
    category = null,
    quantity = 1,
    condition = null,
    availability_window_start = null,
    availability_window_end = null,
    location_text = null,
    latitude = null,
    longitude = null,
    is_recurring = false,
    recurring_details = null,
    owner_user_id = req.user.id, // Set to authenticated user's ID
    owner_community_id = null,
    status = 'available'
  } = payload;
  console.log('Creating resource with payload:', payload);

  // Validation
  if (!name) {
    return res.status(400).json({ error: 'Resource name is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO resources (name, description, category, quantity, condition, 
                            availability_window_start, availability_window_end, 
                            location_text, latitude, longitude, is_recurring, 
                            recurring_details, owner_user_id, owner_community_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        name, description, category, quantity, condition,
        availability_window_start, availability_window_end,
        location_text, latitude, longitude, is_recurring,
        recurring_details, owner_user_id, owner_community_id, status
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating resource:', err);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// GET /resources - Get all available resources with optional filters
router.get('/', async (req, res) => {
  const { category, status, is_recurring } = req.query;
  let query = 'SELECT * FROM resources WHERE 1=1';
  const queryParams = [];
  let paramIndex = 1;

  if (category) {
    query += ` AND category = $${paramIndex++}`;
    queryParams.push(category);
  }
  if (status) {
    query += ` AND status = $${paramIndex++}`;
    queryParams.push(status);
  }
  if (is_recurring !== undefined) {
    query += ` AND is_recurring = $${paramIndex++}`;
    queryParams.push(is_recurring);
  }

  query += ' ORDER BY created_at DESC'; // Default sort

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /resources/user/:userId - Get resources listed by a specific user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM resources WHERE owner_user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user resources:', err);
    res.status(500).json({ error: 'Failed to fetch user resources' });
  }
});

// GET /resources/community/:communityId - Get resources listed by a specific community
router.get('/community/:communityId', async (req, res) => {
  const { communityId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM resources WHERE owner_community_id = $1 ORDER BY created_at DESC', [communityId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching community resources:', err);
    res.status(500).json({ error: 'Failed to fetch community resources' });
  }
});

// GET /resources/:resourceId - Get details of a specific resource
router.get('/:resourceId', async (req, res) => {
  const { resourceId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM resources WHERE id = $1', [resourceId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching resource details:', err);
    res.status(500).json({ error: 'Failed to fetch resource details' });
  }
});

// PUT /resources/:resourceId - Update an existing resource
router.put('/:resourceId', authenticate, async (req, res) => {
  const { resourceId } = req.params;
  const {
    name,
    description,
    category,
    quantity,
    condition,
    availability_window_start,
    availability_window_end,
    location_text,
    latitude,
    longitude,
    is_recurring,
    recurring_details,
    user_id,
    owner_community_id, // owner_user_id is not updatable directly, tied to creator
    status
  } = req.body;
 const currentUserId = parseInt(user_id);
  if (!name) { // Basic validation
    return res.status(400).json({ error: 'Resource name is required.' });
  }

  try {
    // First, fetch the resource to check ownership
    const resourceResult = await pool.query('SELECT owner_user_id, owner_community_id FROM resources WHERE id = $1', [resourceId]);
    if (resourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = resourceResult.rows[0];
    // TODO: Add more robust authorization check (e.g., community admin rights)
    //log the type and value of both resource.owner_user_id and currentUserId
    console.log('Resource owner ID:', resource.owner_user_id, 'Current user ID:', currentUserId);
    if (resource.owner_user_id !== currentUserId) {
      return res.status(403).json({ error: 'User not authorized to update this resource.' });
    }

    const updateQuery = `
      UPDATE resources 
      SET name = $1, description = $2, category = $3, quantity = $4, condition = $5,
          availability_window_start = $6, availability_window_end = $7,
          location_text = $8, latitude = $9, longitude = $10, is_recurring = $11,
          recurring_details = $12, owner_community_id = $13, status = $14
          -- updated_at is handled by the trigger
      WHERE id = $15
      RETURNING *
    `;
    const values = [
      name, description, category, quantity, condition,
      availability_window_start, availability_window_end,
      location_text, latitude, longitude, is_recurring,
      recurring_details, owner_community_id, status,
      resourceId
    ];

    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) { // Should not happen if previous check passed
      return res.status(404).json({ error: 'Resource not found after update attempt' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating resource:', err);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// DELETE /resources/:resourceId - Delete a resource
router.delete('/:resourceId', authenticate, async (req, res) => {
  const { resourceId } = req.params;
  const currentUserId = req.user.id;

  try {
    // First, fetch the resource to check ownership
    const resourceResult = await pool.query('SELECT owner_user_id, owner_community_id FROM resources WHERE id = $1', [resourceId]);
    if (resourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = resourceResult.rows[0];
    // TODO: Add more robust authorization check (e.g., community admin rights)
    if (resource.owner_user_id !== currentUserId) {
      return res.status(403).json({ error: 'User not authorized to delete this resource.' });
    }

    const result = await pool.query('DELETE FROM resources WHERE id = $1 RETURNING *', [resourceId]);
    if (result.rowCount === 0) { // Should not happen if previous check passed
      return res.status(404).json({ error: 'Resource not found for deletion' });
    }
    res.status(204).send(); // No Content
  } catch (err) {
    console.error('Error deleting resource:', err);
    // Check for foreign key violation if any (e.g. if resources are linked to other tables)
    if (err.code === '23503') { // PostgreSQL foreign key violation error code
        return res.status(409).json({ error: 'Cannot delete resource as it is referenced by other entities.' });
    }
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;
