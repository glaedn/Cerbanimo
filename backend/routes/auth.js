import express from 'express';
import pool from '../db.js';


// Create a router instance
const router = express.Router();
// Save or Update User
router.post('/save-user', async (req, res) => {
  const { sub, email, name, picture } = req.body;

  try {
    // Check if user exists
    const existingUser = await pool.query(
      `SELECT id, auth0_id, username, email, profile_picture, city, state, country,
       ST_AsGeoJSON(location_point) as location
       FROM users WHERE auth0_id = $1`,
      [sub]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      // Parse GeoJSON location if it exists
      if (user.location) {
        user.location = JSON.parse(user.location);
      }

      // Update picture if current is null
      if (!user.profile_picture && picture) {
        await pool.query(
          'UPDATE users SET profile_picture = $1 WHERE auth0_id = $2',
          [picture, sub]
        );
        user.profile_picture = picture;
      }
      return res.status(200).json({ message: 'User already exists', user });
    }

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO users (auth0_id, email, username, profile_picture)
       VALUES ($1, $2, $3, $4)
       RETURNING id, auth0_id, username, email, profile_picture`,
      [sub, email, name, picture]
    );

    res.status(201).json({ message: 'User created', user: newUser.rows[0] });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
