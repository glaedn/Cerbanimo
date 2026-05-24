import express from 'express';
import { verificationService, disputeService } from '../services/VerificationService.js';
import pool from '../db.js';

const router = express.Router();

router.post('/events', async (req, res) => {
  const { taskId, verifierId, status, proofOfWorkLink, verificationType, needId } = req.body;
  try {
    const event = await verificationService.recordVerificationEvent(taskId, verifierId, status, proofOfWorkLink, verificationType, needId);
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/challenge', async (req, res) => {
  const challengerId = req.user?.id || req.body.challengerId;
  const { reason } = req.body;

  if (!challengerId) {
    return res.status(400).json({ error: 'Challenger user ID is required' });
  }

  try {
    const challenge = await verificationService.openChallenge(req.params.id, challengerId, reason || '');
    res.status(201).json(challenge);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/feedback', async (req, res) => {
  const { needId, taskId, isSafe, isFulfilled, comment } = req.body;
  const userId = req.user.id;
  try {
    const query = `
      INSERT INTO feedback (user_id, need_id, task_id, is_safe, is_fulfilled, comment)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, needId, taskId, isSafe, isFulfilled, comment]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/disputes', async (req, res) => {
  const { taskId, openerId, reason } = req.body;
  try {
    const dispute = await disputeService.openDispute(taskId, openerId, reason);
    res.status(201).json(dispute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/disputes/:disputeId/votes', async (req, res) => {
  const { voterId, vote, splitPercentage, comment } = req.body;
  try {
    const castVote = await disputeService.castVote(req.params.disputeId, voterId, vote, splitPercentage, comment);
    res.status(201).json(castVote);
  } catch (err) {
    console.error("Error casting vote:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/disputes/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, t.name as task_name, t.description as task_desc
      FROM disputes d
      JOIN tasks t ON d.task_id = t.id
      WHERE d.status IN ('open', 'review')
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/detect-bad-actors/:userId', async (req, res) => {
  try {
    const flags = await verificationService.detectBadActors(req.params.userId);
    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
