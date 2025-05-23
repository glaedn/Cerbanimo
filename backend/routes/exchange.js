// backend/routes/exchange.js
import express from 'express';
import { initiateExchange } from '../services/resourceExchangeService.js';
import db from '../db.js'; // Database pool
import authenticate from '../middleware/authenticate.js'; // Authentication middleware

const router = express.Router();

// POST /initiate - Initiate a resource exchange
router.post('/initiate', authenticate, async (req, res) => {
  const { needId, resourceId, notes } = req.body;
  const loggedInUserId = req.user.id; // Provided by the authenticate middleware

  if (!needId || !resourceId) {
    return res.status(400).json({ message: 'needId and resourceId are required in the request body.' });
  }

  try {
    const result = await initiateExchange({ needId, resourceId, loggedInUserId, notes }, db);
    // The service is expected to return { success: true, coordinationTaskId, message }
    res.status(201).json(result);
  } catch (error) {
    console.error(`Exchange initiation failed for NeedID: ${needId}, ResourceID: ${resourceId} by UserID: ${loggedInUserId}:`, error.message);

    // Handle specific error messages from the service layer
    if (error.message.toLowerCase().includes('not found')) {
      // Covers "Need not found" or "Resource not found"
      return res.status(404).json({ message: error.message });
    }
    if (error.message.toLowerCase().includes('no longer open') || error.message.toLowerCase().includes('no longer available')) {
      // Covers "Need is no longer open" or "Resource is no longer available"
      // 409 Conflict is appropriate as the state of the resource prevents the operation
      return res.status(409).json({ message: error.message });
    }
    
    // Default to 500 for other types of errors (e.g., database connection issues, unexpected errors)
    res.status(500).json({ message: 'Failed to initiate exchange due to an internal server error.' });
  }
});

// --- Future Endpoints Placeholder Comments ---

// POST /exchange/confirm_pickup/:taskId 
// Description: Confirms that the resource has been picked up by the recipient or a courier.
// Logic: Updates the status of the coordination task and potentially the resource.
// router.post('/confirm_pickup/:taskId', authenticate, async (req, res) => { /* ... */ });

// POST /exchange/confirm_delivery/:taskId
// Description: Confirms that the resource has been delivered to the need requestor.
// Logic: Updates the status of the coordination task and potentially the resource/need.
// router.post('/confirm_delivery/:taskId', authenticate, async (req, res) => { /* ... */ });

// POST /exchange/verify_exchange/:taskId
// Description: Final verification by both parties (or an admin) that the exchange is complete and satisfactory.
// Logic: Updates related task, need, and resource statuses to 'completed' or 'exchanged'. Triggers rewards/reputation updates.
// router.post('/verify_exchange/:taskId', authenticate, async (req, res) => { /* ... */ });

// POST /exchange/cancel/:taskId
// Description: Allows a user involved in the exchange (or admin) to cancel the exchange process.
// Logic: Updates task, need, and resource statuses to reflect cancellation (e.g., back to 'open' or 'available' if appropriate, or 'cancelled').
// router.post('/cancel/:taskId', authenticate, async (req, res) => { /* ... */ });


export default router; // For ES6 modules
// module.exports = router; // For CommonJS, if project uses that convention.
