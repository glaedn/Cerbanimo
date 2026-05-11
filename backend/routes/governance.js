import express from 'express';
import GovernanceService from '../services/GovernanceService.js';
import AIGatewayService from '../services/AIGatewayService.js';
import resolveUser from '../middlewares/resolveUser.js';
import pool from '../db.js';

const router = express.Router();

// Helper to check community membership
async function checkMembership(userId, communityId) {
  const result = await pool.query(
    'SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members)',
    [communityId, userId]
  );
  if (result.rows.length === 0) {
    throw new Error('User is not a member of this community');
  }
}

// Get active proposals for a community
router.get('/community/:communityId/proposals', async (req, res) => {
  try {
    const { communityId } = req.params;
    const result = await pool.query(
      'SELECT * FROM proposals WHERE community_id = $1 ORDER BY created_at DESC',
      [communityId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a proposal
router.post('/community/:communityId/proposals', resolveUser, async (req, res) => {
  try {
    const { communityId } = req.params;
    await checkMembership(req.user.id, communityId);
    const { type, title, description, payload } = req.body;
    const actorId = req.user.id;

    const proposal = await GovernanceService.createProposal(communityId, type, title, description, payload, actorId);
    res.status(201).json(proposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cast a vote
router.post('/proposals/:proposalId/vote', resolveUser, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const propRes = await pool.query('SELECT community_id FROM proposals WHERE id = $1', [proposalId]);
    if (propRes.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
    await checkMembership(req.user.id, propRes.rows[0].community_id);
    const { voteValue } = req.body;
    const userId = req.user.id;

    const vote = await GovernanceService.castVote(proposalId, userId, voteValue);
    res.json(vote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Execute a proposal
router.post('/proposals/:proposalId/execute', resolveUser, async (req, res) => {
  try {
    const { proposalId } = req.params;

    // Check if user is a member of the community or if they are the creator
    const propRes = await pool.query('SELECT community_id, created_by FROM proposals WHERE id = $1', [proposalId]);
    if (propRes.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });

    if (propRes.rows[0].created_by !== req.user.id) {
       await checkMembership(req.user.id, propRes.rows[0].community_id);
       // Further restriction could be added here (e.g. only admins)
    }

    const result = await GovernanceService.executeProposal(proposalId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get delegation graph for a community
router.get('/community/:communityId/delegations', async (req, res) => {
  try {
    const { communityId } = req.params;
    const result = await pool.query(`
      SELECT d.*, u1.username as delegator_name, u2.username as delegate_name
      FROM delegations d
      JOIN users u1 ON d.delegator_id = u1.id
      JOIN users u2 ON d.delegate_id = u2.id
      WHERE d.delegator_id IN (SELECT unnest(members) FROM communities WHERE id = $1)
    `, [communityId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a delegation
router.post('/delegate', resolveUser, async (req, res) => {
   try {
     const { delegateId, domain, region, expiresAt } = req.body;
     const delegatorId = req.user.id;

     const result = await pool.query(
       'INSERT INTO delegations (delegator_id, delegate_id, domain, region, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
       [delegatorId, delegateId, domain, region, expiresAt]
     );
     res.status(201).json(result.rows[0]);
   } catch (err) {
     res.status(500).json({ error: err.message });
   }
});

// Get active constitution
router.get('/community/:communityId/constitution', async (req, res) => {
  try {
    const { communityId } = req.params;
    const result = await pool.query(
      'SELECT * FROM constitutions WHERE community_id = $1 AND active = TRUE',
      [communityId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run a neural simulation for a community
router.post('/community/:communityId/simulate', resolveUser, async (req, res) => {
  try {
    const { communityId } = req.params;
    const { quorum, delegationDepth, voteThreshold, emergencyOverride } = req.body;

    const prompt = `
      Simulate a governance scenario for community ${communityId} with the following parameters:
      - Quorum Target: ${quorum}%
      - Delegation Max Depth: ${delegationDepth}
      - Passing Threshold: ${voteThreshold}%
      - Emergency Powers: ${emergencyOverride ? 'Enabled' : 'Disabled'}

      Return a JSON object with:
      1. "insight": A 2-sentence analytical forecast.
      2. "metrics": { "participation": number, "stability": number, "speed": number, "burnout": number, "strain": number }
    `;

    const aiResponse = await AIGatewayService.query(prompt, 'governance-simulator');

    let result;
    try {
      result = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
    } catch (e) {
      const score = (quorum * 0.4) + (voteThreshold * 0.2) + (delegationDepth * 10);
      result = {
        insight: `Increasing quorum targets without delegation support may lead to "Governance Gridlock." Consider enabling domain-specific delegation.`,
        metrics: {
          participation: Math.min(100, quorum * 3),
          stability: 100 - (delegationDepth * 15),
          speed: emergencyOverride ? 95 : 45,
          burnout: (quorum > 30 ? 60 : 20) + (voteThreshold > 75 ? 25 : 0),
          strain: emergencyOverride ? 85 : 30
        }
      };
    }

    res.json({
      ...result,
      legitimacy: (quorum * 0.4 + voteThreshold * 0.2 + delegationDepth * 10) > 50 ? 'High' : 'At Risk'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
