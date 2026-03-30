import express from 'express';
import { verificationService, disputeService } from '../services/VerificationService.js';

const router = express.Router();

router.post('/events', async (req, res) => {
  const { taskId, verifierId, status, proofOfWorkLink } = req.body;
  try {
    const event = await verificationService.recordVerificationEvent(taskId, verifierId, status, proofOfWorkLink);
    res.status(201).json(event);
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
  const { voterId, vote, comment } = req.body;
  try {
    const castVote = await disputeService.castVote(req.params.disputeId, voterId, vote, comment);
    res.status(201).json(castVote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
