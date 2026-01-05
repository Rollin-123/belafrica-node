// src/routes/debug.routes.ts
import { Router } from 'express';
import { getGeoDebug, postTestValidation } from '../controllers/debug.controller';

const router = Router();


router.get('/geo', getGeoDebug);
router.post('/test-validation', postTestValidation);

export default router;