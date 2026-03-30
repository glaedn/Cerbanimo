import express from 'express';
import StoryEngineService from '../services/StoryEngineService.js';

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

export default router;
