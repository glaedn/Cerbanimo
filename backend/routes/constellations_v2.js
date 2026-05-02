import express from 'express';
import ConstellationService from '../services/ConstellationService.js';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM constellations');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/form', async (req, res) => {
  const { name, sharedObjective, outcomeId } = req.body;
  try {
    const constellation = await ConstellationService.formConstellation(name, sharedObjective, outcomeId);
    res.status(201).json(constellation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:constellationId/members', async (req, res) => {
  const { entityType, entityId } = req.body;
  try {
    const member = await ConstellationService.addMember(req.params.constellationId, entityType, entityId);
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:constellationId/tasks', async (req, res) => {
  const { taskId } = req.body;
  try {
    const task = await ConstellationService.addSharedTask(req.params.constellationId, taskId);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
