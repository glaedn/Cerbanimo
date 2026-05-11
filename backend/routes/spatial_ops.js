import express from 'express';
import CrisisService from '../services/CrisisService.js';
import SpatialQueryService from '../services/SpatialQueryService.js';
import RegionalIntelligenceService from '../services/RegionalIntelligenceService.js';
import GeocodingService from '../services/GeocodingService.js';
import resolveUser from '../middlewares/resolveUser.js';

const router = express.Router();

router.get('/tactical-overlay', async (req, res) => {
  try {
    const overlay = await CrisisService.getTacticalOverlay();
    res.json(overlay || { crisis: { enabled: false } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search-location', async (req, res) => {
  try {
    const { q } = req.query;
    const results = await GeocodingService.search(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const result = await GeocodingService.reverse(lat, lon);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/nearby-capabilities', async (req, res) => {
  try {
    const { lat, lon, radius, skills } = req.query;
    const skillIds = skills ? skills.split(',').map(Number) : [];
    const capabilities = await SpatialQueryService.findNearbyCapability(
      parseFloat(lat),
      parseFloat(lon),
      parseFloat(radius) || 10000,
      skillIds
    );
    res.json(capabilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/regional-health/:regionId', async (req, res) => {
  try {
    const health = await RegionalIntelligenceService.getRegionalHealth(req.params.regionId);
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
