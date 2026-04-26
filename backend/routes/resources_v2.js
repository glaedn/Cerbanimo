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

router.get('/community/:communityId', async (req, res) => {
  try {
    const resources = await ResourceService.getCommunityResources(req.params.communityId);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add', async (req, res) => {
  const { ownerUserId, ownerCommunityId, name, description, category, condition, quantity, unit, skillIds, locationText } = req.body;
  try {
    const resource = await ResourceService.addResource(ownerUserId, ownerCommunityId, name, description, category, condition, quantity, unit, 'available', skillIds, locationText);
    res.status(201).json(resource);
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

router.get('/catalog', async (req, res) => {
  const { category, search } = req.query;
  try {
    const resources = await ResourceService.getAllResources({ category, search });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedule/:userId', async (req, res) => {
  try {
    const schedule = await ResourceService.getBookingSchedule(req.params.userId);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conflicts/:userId', async (req, res) => {
  try {
    const conflicts = await ResourceService.getConflicts(req.params.userId);
    res.json(conflicts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conflicts/:conflictId/resolve', async (req, res) => {
  const { winningAllocationId, resolutionText } = req.body;
  try {
    const result = await ResourceService.resolveConflict(req.params.conflictId, winningAllocationId, resolutionText);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/inventory/:id', async (req, res) => {
  const { name, description, category, condition, quantity, unit, status, skillIds, locationText } = req.body;
  try {
    const result = await ResourceService.updateResource(req.params.id, { name, description, category, condition, quantity, unit, status, skillIds, locationText });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inventory/:id', async (req, res) => {
  try {
    const result = await ResourceService.deleteResource(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
