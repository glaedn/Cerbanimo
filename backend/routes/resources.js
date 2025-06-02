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
    status = 'available',
    tags = null,
    constraints = null,
    duration_type = null,
    duration_details = null
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
                            recurring_details, owner_user_id, owner_community_id, status,
                            tags, constraints, duration_type, duration_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        name, description, category, quantity, condition,
        availability_window_start, availability_window_end,
        location_text, latitude, longitude, is_recurring,
        recurring_details, owner_user_id, owner_community_id, status,
        tags, constraints, duration_type, duration_details
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
  const {
    category, status, is_recurring, tags, duration_type,
    min_lat, max_lat, min_lon, max_lon,
    verified_owner,
    availability_start_after, availability_end_before, available_now
  } = req.query;

  let queryParams = [];
  let paramIndex = 1;

  let query = `
    WITH resources_with_verification AS (
      SELECT
        r.*,
        COALESCE(u_owner.verified_status, c_owner.verified_status, FALSE) AS owner_is_verified
      FROM resources r
      LEFT JOIN users u_owner ON r.owner_user_id = u_owner.id
      LEFT JOIN communities c_owner ON r.owner_community_id = c_owner.id
    )
    SELECT * FROM resources_with_verification r_wv
    WHERE 1=1
  `;

  if (category) {
    query += ` AND r_wv.category = $${paramIndex++}`;
    queryParams.push(category);
  }
  if (status) {
    query += ` AND r_wv.status = $${paramIndex++}`;
    queryParams.push(status);
  } else {
    // Default to 'available' resources if no status filter is provided
    query += ` AND r_wv.status = 'available'`;
  }

  if (is_recurring !== undefined) {
    query += ` AND r_wv.is_recurring = $${paramIndex++}`;
    queryParams.push(is_recurring === 'true' || is_recurring === true);
  }

  if (tags) {
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (tagsArray.length > 0) {
      query += ` AND r_wv.tags && $${paramIndex++}`;
      queryParams.push(tagsArray);
    }
  }

  if (duration_type) {
    query += ` AND r_wv.duration_type = $${paramIndex++}`;
    queryParams.push(duration_type);
  }

  // Bounding box location filter
  if (min_lat && max_lat && min_lon && max_lon) {
    query += ` AND r_wv.latitude BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    queryParams.push(parseFloat(min_lat), parseFloat(max_lat));
    query += ` AND r_wv.longitude BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    queryParams.push(parseFloat(min_lon), parseFloat(max_lon));
  }

  // Verified owner filter
  if (verified_owner === 'true') {
    query += ` AND r_wv.owner_is_verified = TRUE`;
  }

  // Availability window filters
  if (available_now === 'true') {
    query += ` AND (r_wv.availability_window_start IS NULL OR r_wv.availability_window_start <= NOW())`;
    query += ` AND (r_wv.availability_window_end IS NULL OR r_wv.availability_window_end >= NOW())`;
  } else {
    if (availability_start_after) {
      query += ` AND (r_wv.availability_window_start IS NULL OR r_wv.availability_window_start >= $${paramIndex++})`;
      queryParams.push(availability_start_after);
    }
    if (availability_end_before) {
      query += ` AND (r_wv.availability_window_end IS NULL OR r_wv.availability_window_end <= $${paramIndex++})`;
      queryParams.push(availability_end_before);
    }
  }

  query += ' ORDER BY r_wv.created_at DESC'; // Default sort

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
    status,
    tags,
    constraints,
    duration_type,
    duration_details
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
          recurring_details = $12, owner_community_id = $13, status = $14,
          tags = $15, constraints = $16, duration_type = $17, duration_details = $18
          -- updated_at is handled by the trigger
      WHERE id = $19
      RETURNING *
    `;
    const values = [
      name, description, category, quantity, condition,
      availability_window_start, availability_window_end,
      location_text, latitude, longitude, is_recurring,
      recurring_details, owner_community_id, status,
      tags, constraints, duration_type, duration_details,
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
