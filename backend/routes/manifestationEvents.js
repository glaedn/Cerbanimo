import express from 'express';
import { scheduleManifestation, getManifestationsForRealm } from '../controllers/manifestationEventController.js';

const router = express.Router();

router.post('/', scheduleManifestation);
router.get('/realm/:realmId', getManifestationsForRealm);

export default router;