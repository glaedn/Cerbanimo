import express from 'express';
import GuildService from '../services/GuildService.js';
import pool from '../db.js';

const router = express.Router();

router.get('/requests', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM skill_requests WHERE status = 'pending'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:guildId/intelligence', async (req, res) => {
  try {
    const intel = await GuildService.getGuildIntelligence(req.params.guildId);
    res.json(intel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests', async (req, res) => {
  const { requesterId, skillName, description } = req.body;
  try {
    const request = await GuildService.requestNewSkill(requesterId, skillName, description);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests/:requestId/vote', async (req, res) => {
  const { userId, approve } = req.body;
  try {
    const request = await GuildService.voteOnSkillRequest(req.params.requestId, userId, approve);
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
