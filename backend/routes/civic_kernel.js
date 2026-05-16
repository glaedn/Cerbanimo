import express from 'express';
import CivicEventService from '../services/CivicEventService.js';
import WorldGraphService from '../services/WorldGraphService.js';
import CivicKernelSummaryService from '../services/CivicKernelSummaryService.js';
import CoordinationAgentService from '../services/CoordinationAgentService.js';

const router = express.Router();

router.get('/overview', async (req, res) => {
  try {
    const overview = await CivicKernelSummaryService.getOverview();
    res.json(overview);
  } catch (err) {
    console.error('Error fetching civic kernel overview:', err);
    res.status(500).json({ error: 'Failed to fetch civic kernel overview' });
  }
});

router.get('/agent-signals', async (req, res) => {
  try {
    const signals = await CoordinationAgentService.getSignals();
    res.json({ signals });
  } catch (err) {
    console.error('Error fetching coordination agent signals:', err);
    res.status(500).json({ error: 'Failed to fetch coordination agent signals' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = await CivicEventService.listEvents({
      subjectType: req.query.subjectType,
      subjectId: req.query.subjectId,
      actorUserId: req.query.actorUserId,
      eventType: req.query.eventType,
      limit: req.query.limit
    });
    res.json(events);
  } catch (err) {
    console.error('Error fetching civic events:', err);
    res.status(500).json({ error: 'Failed to fetch civic events' });
  }
});

router.get('/graph/:entityType/:entityId', async (req, res) => {
  try {
    const graph = await WorldGraphService.getEntityNeighborhood(
      req.params.entityType,
      req.params.entityId,
      req.query.depth
    );
    res.json(graph);
  } catch (err) {
    console.error('Error fetching world graph neighborhood:', err);
    res.status(500).json({ error: 'Failed to fetch world graph neighborhood' });
  }
});

export default router;
