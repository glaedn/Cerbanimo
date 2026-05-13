import express from 'express';
import FederationService from '../services/FederationService.js';
import resolveUser from '../middlewares/resolveUser.js';
import pool from '../db.js';

const router = express.Router();

// Get federation atlas
router.get('/atlas', async (req, res) => {
  try {
    const atlas = await FederationService.getFederationAtlas();
    res.json(atlas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Propose a treaty
router.post('/treaty', resolveUser, async (req, res) => {
  try {
    const { communityA, communityB, type, terms } = req.body;

    // Authorization: User must be a member of communityA to propose a treaty FROM it
    const memberCheck = await pool.query(
      'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
      [communityA, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only community members can propose federation treaties.' });
    }

    const treaty = await FederationService.createTreaty(communityA, communityB, type, terms);
    res.status(201).json(treaty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update treaty status
router.patch('/treaty/:treatyId', resolveUser, async (req, res) => {
  try {
    const { treatyId } = req.params;
    const { status } = req.body;

    // Authorization: User must be a member of either community involved
    const treatyCheck = await pool.query(
       'SELECT community_a, community_b FROM federation_treaties WHERE id = $1',
       [treatyId]
    );

    if (treatyCheck.rows.length === 0) return res.status(404).json({ error: 'Treaty not found' });

    const { community_a, community_b } = treatyCheck.rows[0];
    const memberCheck = await pool.query(
      'SELECT 1 FROM communities WHERE (id = $1 OR id = $2) AND $3 = ANY(members)',
      [community_a, community_b, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to update this treaty.' });
    }

    const treaty = await FederationService.updateTreatyStatus(treatyId, status);
    res.json(treaty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
