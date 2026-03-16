/* 
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
 */
import { Router } from 'express';
import { requestOtp, verifyOtp, completeProfile, getProfile, updateProfile } from '../controllers/auth.controller';
import { verifyCountryByIp } from '../middleware/geoip.middleware';
import { protect, protectTemp } from '../middleware/auth.middleware';

const router = Router();

router.post('/request-otp', verifyCountryByIp('countryCode'), requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/complete-profile', protectTemp, completeProfile);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router;
