import express from 'express';
import SolidarityService from '../services/SolidarityService.js';
import resolveUser from '../middlewares/resolveUser.js';
import pool from '../db.js';

const router = express.Router();

router.get('/pools', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM solidarity_pools');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pools/:poolId/draws', async (req, res) => {
  try {
    const { poolId } = req.params;
    const result = await pool.query('SELECT * FROM solidarity_draws WHERE pool_id = $1 ORDER BY created_at DESC', [poolId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pools/:poolId/contribute', resolveUser, async (req, res) => {
  try {
    const { poolId } = req.params;
    const { communityId, amount } = req.body;

    // Authorization: User must be member of communityId
    const memberCheck = await pool.query(
      'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
      [communityId, req.user.id]
    );
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Unauthorized contribution' });

    const result = await SolidarityService.contributeToPool(poolId, communityId, amount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
