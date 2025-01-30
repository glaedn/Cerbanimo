const express = require('express');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  const { category } = req.query;
    
  // Fetch skill names with associated tasks
  router.get('/', async (req, res) => {
    try {
      const query = `
        SELECT DISTINCT s.name 
        FROM tasks t
        JOIN skills s ON t.skill_id = s.id
        WHERE s.category = $1
      `;
  
      const result = await pool.query(query);
  
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching skills:', err);
       res.status(500).json({ message: 'Failed to fetch skills' });
    }
  });
};

module.exports = router;