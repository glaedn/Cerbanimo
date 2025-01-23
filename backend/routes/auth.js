const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// Save or Update User
router.post('/save-user', async (req, res) => {
  const { sub, email, name } = req.body;

  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE auth0_id = $1',
      [sub]
    );

    if (existingUser.rows.length > 0) {
      return res.status(200).json({ message: 'User already exists', user: existingUser.rows[0] });
    }

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO users (auth0_id, email, username) VALUES ($1, $2, $3) RETURNING *`,
      [sub, email, name]
    );

    res.status(201).json({ message: 'User created', user: newUser.rows[0] });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
