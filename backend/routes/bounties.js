import express from 'express';
import BountyService from '../services/BountyService.js';
import resolveUser from '../middlewares/resolveUser.js';
import pool from '../db.js';

const router = express.Router();

router.get('/community/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const result = await pool.query(
      'SELECT * FROM bounties WHERE posted_by_community_id = $1 ORDER BY created_at DESC',
      [communityId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/open', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT b.*, c.name as community_name FROM bounties b JOIN communities c ON b.posted_by_community_id = c.id WHERE b.status = 'open' ORDER BY b.created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:bountyId/claim', resolveUser, async (req, res) => {
  try {
    const { bountyId } = req.params;
    const bounty = await BountyService.claimBounty(bountyId, req.user.id);
    res.json(bounty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:bountyId/verify-pay', resolveUser, async (req, res) => {
  try {
    const { bountyId } = req.params;

    // Authorization: Only community admins of the community that posted the bounty can verify/pay
    const bountyRes = await pool.query('SELECT posted_by_community_id FROM bounties WHERE id = $1', [bountyId]);
    if (bountyRes.rows.length === 0) return res.status(404).json({ error: 'Bounty not found' });

    const communityId = bountyRes.rows[0].posted_by_community_id;
    const adminCheck = await pool.query(
      "SELECT 1 FROM users WHERE id = $1 AND id = ANY(SELECT unnest(members) FROM communities WHERE id = $2) AND roles @> '{admin}'",
      [req.user.id, communityId]
    );

    if (adminCheck.rows.length === 0) return res.status(403).json({ error: 'Only community admins can verify and pay bounties.' });

    const result = await BountyService.verifyAndPayBounty(bountyId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
