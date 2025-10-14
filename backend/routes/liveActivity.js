import express from 'express';
import { getLiveActivity } from '../controllers/liveActivityController.js';

const router = express.Router();

router.get('/', getLiveActivity);

export default router;