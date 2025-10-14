import express from 'express';
import {
  createSession,
  startSession,
  endSession,
  addParticipant,
  recordResonance,
  recordEvent,
  recordBatchResonance
} from '../controllers/manifestationSessionController.js';
import { auth } from 'express-oauth2-jwt-bearer';

const router = express.Router();

const jwtCheck = auth({
  audience: process.env.BACKEND_URL,
  issuerBaseURL: 'https://dev-i5331ndl5kxve1hd.us.auth0.com/',
  tokenSigningAlg: 'RS256',
});

// All routes in this file will be protected
router.use(jwtCheck);

router.post('/', createSession);
router.put('/:sessionId/start', startSession);
router.put('/:sessionId/end', endSession);
router.post('/:sessionId/participants', addParticipant);
router.post('/:sessionId/resonance', recordResonance);
router.post('/:sessionId/batch-resonance', recordBatchResonance);
router.post('/:sessionId/events', recordEvent);

export default router;