// backend/routes/impact.js
import express from 'express';
import {
  getOverallPlatformImpact,
  getCommunityImpactStats,
} from '../services/impactService.js';
import db from '../db.js'; // Database pool
import ensureAuthenticated from '../middlewares/authenticate.js'; // Authentication middleware

const router = express.Router();
const authenticate = ensureAuthenticated; // Alias for clarity
// GET overall platform impact summary
// Path: /impact/summary (when mounted in server.js as app.use('/impact', impactRoutes))
router.get('/summary', authenticate, async (req, res) => {
  try {
    const summary = await getOverallPlatformImpact(db);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching platform impact summary:', error);
    res.status(500).json({ message: 'Failed to fetch platform impact summary.' });
  }
});

// GET impact summary for a specific community
// Path: /impact/community/:communityId
router.get('/community/:communityId', authenticate, async (req, res) => {
  const { communityId } = req.params;
  
  // Basic validation for communityId
  const parsedCommunityId = parseInt(communityId, 10);
  if (isNaN(parsedCommunityId) || parsedCommunityId <= 0) {
    return res.status(400).json({ message: 'A valid positive integer communityId parameter is required.' });
  }

  try {
    // The impactService.getCommunityImpactStats currently returns 0 counts if communityId doesn't exist
    // or has no fulfilled/exchanged items. It doesn't throw a specific "not found" error for the community itself.
    // Thus, a 404 for the community specifically is not handled here unless the service changes.
    const stats = await getCommunityImpactStats(db, parsedCommunityId);
    res.json(stats);
  } catch (error) {
    // This catch block will handle errors thrown by the service, e.g., DB connection errors.
    console.error(`Error fetching impact stats for community ${parsedCommunityId}:`, error);
    // If the service were to throw a specific error for "Community Not Found", it could be handled here:
    // if (error.name === 'CommunityNotFoundError') {
    //   return res.status(404).json({ message: error.message });
    // }
    res.status(500).json({ message: `Failed to fetch impact stats for community ${parsedCommunityId}.` });
  }
});

export default router; // ES6 module export
// module.exports = router; // CommonJS, if project convention changes. (Sticking to ES6)
