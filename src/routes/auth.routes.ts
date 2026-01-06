/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Router } from 'express';
import { requestOtp, verifyOtp, completeProfile } from '../controllers/auth.controller';
import { verifyCountryByIp } from '../middleware/geoip.middleware';
import { protectTemp } from '../middleware/auth.middleware';

const router = Router();

router.post('/request-otp', verifyCountryByIp('countryCode'), requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/complete-profile', protectTemp, completeProfile);

export default router;
