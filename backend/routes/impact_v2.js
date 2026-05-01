import express from 'express';
import ImpactGraphService from '../services/ImpactGraphService.js';

const router = express.Router();

router.post('/outcomes', async (req, res) => {
  const { projectId, statement } = req.body;
  try {
    const outcome = await ImpactGraphService.createOutcome(projectId, statement);
    res.status(201).json(outcome);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/outcomes/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const outcomes = await ImpactGraphService.getOutcomes(projectId);
    res.json(outcomes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trace/:taskId', async (req, res) => {
  try {
    const trace = await ImpactGraphService.getImpactTrace(req.params.taskId);
    res.json(trace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/atlas', async (req, res) => {
  const { projectId, realmId } = req.query;
  try {
    const atlasData = await ImpactGraphService.getAtlasData(projectId, realmId);
    res.json(atlasData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
