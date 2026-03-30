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

router.get('/:constellationId/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN constellation_tasks ct ON t.id = ct.task_id
      JOIN projects p ON t.project_id = p.id
      WHERE ct.constellation_id = $1
    `, [req.params.constellationId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:constellationId/amendments', async (req, res) => {
  const { proposerId, oldObjective, newObjective } = req.body;
  try {
    const amendment = await ConstellationService.amendObjective(req.params.constellationId, proposerId, oldObjective, newObjective);
    res.status(201).json(amendment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:constellationId/amendments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM objective_amendments WHERE constellation_id = $1 AND status = $2', [req.params.constellationId, 'voting']);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/amendments/:amendmentId/vote', async (req, res) => {
    const { voterId, rankings } = req.body;
    try {
        const vote = await ConstellationService.castRankedChoiceVote(req.params.amendmentId, voterId, rankings);
        res.json(vote);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
