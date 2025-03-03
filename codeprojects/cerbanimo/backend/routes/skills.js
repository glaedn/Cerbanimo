import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// ✅ Fetch skills by category
router.get('/', async (req, res) => {
  try {
    const category = req.query.category;

    // Validate category input
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ message: "Valid category is required" });
    }

    const query = `SELECT DISTINCT name FROM skills WHERE category = $1`;
    const result = await pool.query(query, [category]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No skills found for this category" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching skills:", err);
    res.status(500).json({ message: "Failed to fetch skills" });
  }
});

export default router;
