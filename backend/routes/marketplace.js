import express from 'express';
import MarketplaceEngine from '../services/MarketplaceEngine.js';
import MarketplaceService from '../services/MarketplaceService.js';
import resolveUser from '../middlewares/resolveUser.js';

const router = express.Router();

// GET /discover - Discovery feed (scored and ranked)
router.get('/discover', async (req, res) => {
  try {
    const userId = req.user.id;
    const { communityId, category, type } = req.query;
    const discoveries = await MarketplaceEngine.discover(userId, { communityId, category, type });
    res.json(discoveries);
  } catch (err) {
    console.error('Marketplace Discovery Error:', err);
    res.status(500).json({ error: 'Failed to fetch discovery feed' });
  }
});

// GET /nearby - Location-based entries
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, radius } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and Longitude are required for nearby discovery.' });
    }
    const userId = req.user.id;
    const nearby = await MarketplaceEngine.getNearby(userId, parseFloat(lat), parseFloat(lon), radius ? parseFloat(radius) : undefined);
    res.json(nearby);
  } catch (err) {
    console.error('Marketplace Nearby Error:', err);
    res.status(500).json({ error: 'Failed to fetch nearby entries' });
  }
});

// GET /activity - Global marketplace activity pulse
router.get('/activity', async (req, res) => {
  try {
    const activity = await MarketplaceService.getActivityStream();
    res.json(activity);
  } catch (err) {
    console.error('Marketplace Activity Error:', err);
    res.status(500).json({ error: 'Failed to fetch marketplace activity' });
  }
});

// GET /detail/:type/:id - Detailed view for an entry
router.get('/detail/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const entry = await MarketplaceService.getEntryById(type, id);
    if (!entry) {
      return res.status(404).json({ error: 'Marketplace entry not found' });
    }
    res.json(entry);
  } catch (err) {
    console.error('Marketplace Detail Error:', err);
    res.status(500).json({ error: 'Failed to fetch entry details' });
  }
});

export default router;
