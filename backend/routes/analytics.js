import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

router.get('/resonance-heatmap', async (req, res) => {
  try {
    const query = `
      SELECT
        i.id,
        i.name,
        COUNT(r.id) AS resonance_count
      FROM intentions i
      LEFT JOIN resonances r ON i.id = r.intention_id
      GROUP BY i.id
      ORDER BY resonance_count DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching resonance heatmap data:', error);
    res.status(500).json({ message: 'Failed to fetch resonance heatmap data' });
  }
});

router.get('/influence-graph', async (req, res) => {
  try {
    const query = `
      SELECT
        u.id,
        u.username,
        (SELECT SUM((elem->>'exp')::int) FROM capabilities c, jsonb_array_elements(c.unlocked_users) AS elem WHERE (elem->>'user_id')::int = u.id) AS experience
      FROM users u
      ORDER BY experience DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching influence graph data:', error);
    res.status(500).json({ message: 'Failed to fetch influence graph data' });
  }
});

export default router;