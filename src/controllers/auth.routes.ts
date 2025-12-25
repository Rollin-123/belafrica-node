import { Router } from 'express';
import { requestOtp, verifyOtp, completeProfile } from '../controllers/auth.controller';
import { verifyCountryByIp } from '../middleware/geoip.middleware';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Le middleware de géo-ip est appliqué ici
router.post('/request-otp', verifyCountryByIp('countryCode'), requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/complete-profile', protect, completeProfile);

export default router;