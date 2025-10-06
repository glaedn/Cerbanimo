import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// Resonate with an intention
router.post('/', async (req, res) => {
  const { userId, intentionId } = req.body;
  try {
    const query = 'INSERT INTO resonances (user_id, intention_id) VALUES ($1, $2) ON CONFLICT (user_id, intention_id) DO NOTHING RETURNING *';
    const result = await pool.query(query, [userId, intentionId]);
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'User has already resonated with this intention.' });
    }
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating resonance:', error);
    res.status(500).json({ message: 'Failed to create resonance' });
  }
});

// Get resonance count for an intention
router.get('/count/:intentionId', async (req, res) => {
  const { intentionId } = req.params;
  try {
    const query = 'SELECT COUNT(*) FROM resonances WHERE intention_id = $1';
    const result = await pool.query(query, [intentionId]);
    res.status(200).json({ count: parseInt(result.rows[0].count, 10) });
  } catch (error) {
    console.error('Error fetching resonance count:', error);
    res.status(500).json({ message: 'Failed to fetch resonance count' });
  }
});

// Check if a user has resonated with an intention
router.get('/user/:userId/intention/:intentionId', async (req, res) => {
    const { userId, intentionId } = req.params;
    try {
        const query = 'SELECT * FROM resonances WHERE user_id = $1 AND intention_id = $2';
        const result = await pool.query(query, [userId, intentionId]);
        res.status(200).json({ hasResonated: result.rows.length > 0 });
    } catch (error) {
        console.error('Error checking resonance:', error);
        res.status(500).json({ message: 'Failed to check resonance' });
    }
});


export default router;