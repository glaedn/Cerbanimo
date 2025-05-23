import express from 'express';
import { findMatchesForNeed, findMatchesForResource } from '../services/matchingService.js'; 
import db from '../db.js'; // Database pool
import authenticate from '../middleware/authenticate.js'; // Authentication middleware

const router = express.Router();

// Match resources for a given need
router.get('/need/:needId', authenticate, async (req, res) => {
  const { needId } = req.params;
  try {
    // First, check if the need itself exists and is matchable (e.g., 'open')
    // The service `findMatchesForNeed` currently returns [] if need is not found or not open.
    // For a specific 404 for the need itself, the service would ideally throw a custom error.
    // Let's assume the service handles initial check and returns empty if not found/matchable.
    
    const matches = await findMatchesForNeed(needId, db);

    // If `findMatchesForNeed` returned an empty array, it could be due to:
    // 1. Need not found.
    // 2. Need status is not 'open'.
    // 3. No matching resources found.
    // The service currently logs a warning for case 1 & 2.
    // For the API consumer, if matches is empty, it just means no suitable resources were found for this needId.
    // A more explicit 404 for the need itself would require the service to throw a specific error.
    // Based on current service, we just return the matches (which could be empty).
    
    // If we wanted to explicitly return 404 if the need itself doesn't exist,
    // we'd need to modify the service or do a preliminary check here:
    // const needCheck = await db.query('SELECT id, status FROM needs WHERE id = $1', [needId]);
    // if (needCheck.rows.length === 0) {
    //   return res.status(404).json({ message: 'Need not found.' });
    // }
    // if (needCheck.rows[0].status !== 'open') {
    //   return res.status(400).json({ message: 'Need is not open for matching.' });
    // }
    // const matches = await findMatchesForNeed(needId, db); // Then call the service

    res.json(matches);
  } catch (error) {
    // This catch block is for unexpected errors thrown by the service or db connection.
    console.error(`Error getting matches for need ${needId}:`, error);
    // Example of handling a specific custom error if the service were to throw it:
    // if (error.name === 'NeedNotFoundError') { 
    //     return res.status(404).json({ message: error.message });
    // }
    res.status(500).json({ message: 'Failed to get matches for need due to an internal error.' });
  }
});

// Match needs for a given resource
router.get('/resource/:resourceId', authenticate, async (req, res) => {
  const { resourceId } = req.params;
  try {
    // Similar to the /need/:needId endpoint, `findMatchesForResource` handles
    // the case where the resource is not found or not 'available' by returning [].
    // A specific 404 for the resource would require service modification or a pre-check.

    const matches = await findMatchesForResource(resourceId, db);

    // const resourceCheck = await db.query('SELECT id, status FROM resources WHERE id = $1', [resourceId]);
    // if (resourceCheck.rows.length === 0) {
    //   return res.status(404).json({ message: 'Resource not found.' });
    // }
    // if (resourceCheck.rows[0].status !== 'available') {
    //   return res.status(400).json({ message: 'Resource is not available for matching.' });
    // }
    // const matches = await findMatchesForResource(resourceId, db);

    res.json(matches);
  } catch (error) {
    console.error(`Error getting matches for resource ${resourceId}:`, error);
    // if (error.name === 'ResourceNotFoundError') {
    //     return res.status(404).json({ message: error.message });
    // }
    res.status(500).json({ message: 'Failed to get matches for resource due to an internal error.' });
  }
});

export default router;
