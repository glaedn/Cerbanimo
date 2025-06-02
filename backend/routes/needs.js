import express from 'express';
import pool from '../db.js'; // Assuming db.js is in the backend directory
import authenticate from '../middlewares/authenticate.js'; // Assuming middleware is in backend/middleware

const router = express.Router();

// POST /needs - Declare a new need
router.post('/', authenticate, async (req, res) => {
  let {
    name,
    description,
    category,
    quantity_needed,
    urgency,
    requestor_user_id, // Can be provided, or taken from req.user.id
    requestor_community_id,
    required_before_date,
    location_text,
    latitude,
    longitude,
    status, // Default is 'open' in schema
    tags,
    constraints,
    duration_type,
    duration_details
  } = req.body;
  console.log('Received data:', req.body);
  console.log('id passed in the req:', req.user.id);
  // If requestor_user_id is not provided, and it's not a community request, set it to the logged-in user.
  if (!requestor_user_id && !requestor_community_id) {
    console.log('No requestor_user_id or requestor_community_id provided, using logged-in user id:', req.user.id);
    requestor_user_id = req.user.id;
  } else if (!requestor_user_id && requestor_community_id) {
    // It's a community request, user_id is implicitly the one making the request via authenticate
    // but the primary requestor is the community. We can also store req.user.id if needed
    // e.g. as 'created_by_user_id' if schema supported it. For now, requestor_user_id can be null.
  //} else if (requestor_user_id && requestor_user_id !== req.user.id && !req.user.isAdmin) {
    // A user is trying to post a need for another user and is not an admin
    // This could be disallowed, or allowed based on specific rules (e.g. community admin)
    // For now, let's assume if requestor_user_id is provided, it must match req.user.id unless it's a community request.
    // This logic might need refinement based on product decisions.
    // If it's a community request, requestor_user_id can be different or null.
  //  if(!requestor_community_id) {
  //      return res.status(403).json({ error: 'You can only declare needs for yourself unless it is a community need or you are an admin.' });
  //  }
  }


  if (!name) {
    return res.status(400).json({ error: 'Need name is required.' });
  }
  if (!requestor_user_id && !requestor_community_id) {
    return res.status(400).json({ error: 'Either requestor_user_id or requestor_community_id must be provided.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO needs (name, description, category, quantity_needed, urgency, 
                          requestor_user_id, requestor_community_id, required_before_date, 
                          location_text, latitude, longitude, status,
                          tags, constraints, duration_type, duration_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        name, description, category, quantity_needed, urgency,
        requestor_user_id, requestor_community_id, required_before_date,
        location_text, latitude, longitude, status,
        tags, constraints, duration_type, duration_details
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating need:', err);
    res.status(500).json({ error: 'Failed to create need' });
  }
});

// GET /needs - Get all needs with optional filters
router.get('/', async (req, res) => {
  const {
    category, urgency, status, tags, duration_type,
    min_lat, max_lat, min_lon, max_lon,
    verified_owner
  } = req.query;

  let queryParams = [];
  let paramIndex = 1;

  // Start with a CTE for owner verification status to simplify the main query
  let query = `
    WITH needs_with_verification AS (
      SELECT
        n.*,
        COALESCE(u_owner.verified_status, c_owner.verified_status, FALSE) AS owner_is_verified
      FROM needs n
      LEFT JOIN users u_owner ON n.requestor_user_id = u_owner.id
      LEFT JOIN communities c_owner ON n.requestor_community_id = c_owner.id
    )
    SELECT * FROM needs_with_verification n_wv
    WHERE 1=1
  `;

  if (category) {
    query += ` AND n_wv.category = $${paramIndex++}`;
    queryParams.push(category);
  }
  if (urgency) {
    query += ` AND n_wv.urgency = $${paramIndex++}`;
    queryParams.push(urgency);
  }
  if (status) {
    query += ` AND n_wv.status = $${paramIndex++}`;
    queryParams.push(status);
  } else {
    query += ` AND (n_wv.status = 'open' OR n_wv.status IS NULL)`;
  }

  if (tags) {
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (tagsArray.length > 0) {
      query += ` AND n_wv.tags && $${paramIndex++}`; // Overlap operator for arrays
      queryParams.push(tagsArray);
    }
  }

  if (duration_type) {
    query += ` AND n_wv.duration_type = $${paramIndex++}`;
    queryParams.push(duration_type);
  }

  // Bounding box location filter
  if (min_lat && max_lat && min_lon && max_lon) {
    query += ` AND n_wv.latitude BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    queryParams.push(parseFloat(min_lat), parseFloat(max_lat));
    query += ` AND n_wv.longitude BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    queryParams.push(parseFloat(min_lon), parseFloat(max_lon));
  }

  // Verified owner filter
  if (verified_owner === 'true') {
    query += ` AND n_wv.owner_is_verified = TRUE`;
  }

  query += ' ORDER BY n_wv.created_at DESC'; // Default sort

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
router.put('/:needId', authenticate, async (req, res) => {
  const { needId } = req.params;
  const currentUserId = req.user.id;
  const {
    name,
    description,
    category,
    quantity_needed,
    urgency,
    // requestor_user_id and requestor_community_id are generally not changed post-creation
    required_before_date,
    location_text,
    latitude,
    longitude,
    status,
    tags,
    constraints,
    duration_type,
    duration_details
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
    // If it's a community need (need.requestor_community_id is not null),
    // currentUserId should be an admin of that community. This logic needs to be implemented.
    // For now, only the original user requestor can update if it's not a community need.

    const updateQuery = `
      UPDATE needs 
      SET name = $1, description = $2, category = $3, quantity_needed = $4, urgency = $5,
          required_before_date = $6, location_text = $7, latitude = $8, longitude = $9, status = $10,
          tags = $11, constraints = $12, duration_type = $13, duration_details = $14
          -- updated_at is handled by the trigger
      WHERE id = $15
      RETURNING *
    `;
    const values = [
      name, description, category, quantity_needed, urgency,
      required_before_date, location_text, latitude, longitude, status,
      tags, constraints, duration_type, duration_details,
      needId
    ];

    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) { // Should not happen if previous check passed
      return res.status(404).json({ error: 'Need not found after update attempt' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating need:', err);
    res.status(500).json({ error: 'Failed to update need' });
  }
});

// DELETE /needs/:needId - Delete a need
router.delete('/:needId', authenticate, async (req, res) => {
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
