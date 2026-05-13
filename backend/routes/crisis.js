import express from 'express';
import CrisisService from '../services/CrisisService.js';
import resolveUser from '../middlewares/resolveUser.js';
import pool from '../db.js';

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const status = await CrisisService.getCrisisMode();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tactical-overlay', async (req, res) => {
  try {
    const overlay = await CrisisService.getTacticalOverlay();
    res.json(overlay);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/toggle', resolveUser, async (req, res) => {
  try {
    // Only platform admins can manually toggle global crisis mode for now
    const userRes = await pool.query('SELECT roles FROM users WHERE id = $1', [req.user.id]);
    if (!userRes.rows[0]?.roles?.includes('admin')) {
      return res.status(403).json({ error: 'Only platform admins can toggle global crisis mode.' });
    }

    const { enabled, details } = req.body;
    const result = await CrisisService.setCrisisMode(enabled, details);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
