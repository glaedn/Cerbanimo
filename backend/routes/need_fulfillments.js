import express from 'express';
import NeedFulfillmentService from '../services/NeedFulfillmentService.js';
import resolveUser from '../middlewares/resolveUser.js';

const router = express.Router();

// Create a fulfillment
router.post('/', resolveUser, async (req, res) => {
  try {
    const fulfillment = await NeedFulfillmentService.createFulfillment(req.body, req.user.id);
    res.status(201).json(fulfillment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get fulfillments for a need
router.get('/need/:needId', async (req, res) => {
  try {
    const { needId } = req.params;
    const fulfillments = await NeedFulfillmentService.getFulfillmentsForNeed(needId);
    res.json(fulfillments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify a fulfillment
router.post('/:id/verify', resolveUser, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NeedFulfillmentService.verifyFulfillment(id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
