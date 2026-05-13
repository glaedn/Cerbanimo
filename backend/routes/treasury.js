import express from 'express';
import TreasuryService from '../services/TreasuryService.js';
import resolveUser from '../middlewares/resolveUser.js';
import pool from '../db.js';

const router = express.Router();

async function checkCommunityAdmin(userId, communityId) {
  const result = await pool.query(
    `SELECT 1 FROM users u
     WHERE u.id = $1
     AND u.id = ANY(SELECT unnest(members) FROM communities WHERE id = $2)
     AND u.roles @> '{admin}'`,
    [userId, communityId]
  );
  if (result.rows.length === 0) {
    throw new Error('Unauthorized: Community admin role required');
  }
}

router.get('/community/:communityId/balance', resolveUser, async (req, res) => {
  try {
    const { communityId } = req.params;

    // Authorization: Member check
    const memberCheck = await pool.query(
      'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
      [communityId, req.user.id]
    );
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Community membership required' });

    const treasury = await TreasuryService.getTreasury(communityId);
    res.json(treasury);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/community/:communityId/transactions', resolveUser, async (req, res) => {
  try {
    const { communityId } = req.params;

    // Authorization: Member check
    const memberCheck = await pool.query(
      'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
      [communityId, req.user.id]
    );
    if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Community membership required' });

    const treasury = await TreasuryService.getTreasury(communityId);
    const result = await pool.query(
      'SELECT * FROM treasury_transactions WHERE treasury_id = $1 ORDER BY created_at DESC LIMIT 50',
      [treasury.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/community/:communityId/reciprocity', async (req, res) => {
  try {
    const { communityId } = req.params;
    const result = await pool.query(
      'SELECT * FROM community_balance_of_aid WHERE from_community_id = $1 OR to_community_id = $1',
      [communityId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
