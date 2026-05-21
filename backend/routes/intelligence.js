import express from 'express';
import CoordinationEngine from '../services/intelligence/CoordinationEngine.js';
import resolveUser from '../middlewares/resolveUser.js';

const router = express.Router();

// GET /intelligence/pulse
// Returns the unified coordination intelligence summary for the current user
router.get('/pulse', resolveUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User context not found' });
    }
    const userId = req.user.id;
    const pulse = await CoordinationEngine.getPulse(userId);
    res.json(pulse);
  } catch (error) {
    console.error('Intelligence Pulse Error:', error);
    res.status(500).json({ error: 'Failed to generate coordination pulse' });
  }
});

export default router;
