const express = require('express');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// Fetch tasks with associated skill categories
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        tasks.id AS task_id,
        tasks.name AS task_name,
        tasks.project_id,
        skills.category AS skill_category
      FROM tasks
      JOIN skills ON tasks.skill_id = skills.id;
    `;

    const result = await pool.query(query);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

module.exports = router;
