import express from 'express';
import StoryEngineService from '../services/StoryEngineService.js';
import pool from '../db.js';

const router = express.Router();

router.post('/units', async (req, res) => {
  const { taskId, userId, role } = req.body;
  try {
    const unit = await StoryEngineService.createStoryUnit(taskId, userId, role);
    res.status(201).json(unit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/narrative/:unitId', async (req, res) => {
  try {
    const content = await StoryEngineService.generateMicroNarrative(req.params.unitId);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summaries/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { type } = req.query;

  try {
    let query = 'SELECT * FROM story_summaries WHERE user_id = $1';
    const params = [userId];

    if (type) {
      query += ' AND summary_type = $2';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
