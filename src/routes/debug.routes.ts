// src/routes/debug.routes.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Router } from 'express';
import { getGeoDebug, postTestValidation } from '../controllers/debug.controller';

const router = Router();


router.get('/geo', getGeoDebug);
router.post('/test-validation', postTestValidation);

export default router;