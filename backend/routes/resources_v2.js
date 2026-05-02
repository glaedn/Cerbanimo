import express from 'express';
import ResourceService from '../services/ResourceService.js';

const router = express.Router();

router.get('/inventory/:userId', async (req, res) => {
  try {
    const resources = await ResourceService.getResourceInventory(req.params.userId);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/allocate', async (req, res) => {
  const { resourceId, taskId, userId, startTime, endTime } = req.body;
  try {
    const allocation = await ResourceService.allocateResource(resourceId, taskId, userId, startTime, endTime);
    res.status(201).json(allocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
