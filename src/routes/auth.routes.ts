// src/routes/auth.routes.ts
import { Router } from 'express';
import { requestOtp, verifyOtp, completeProfile } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { requestOtpSchema, verifyOtpSchema, completeProfileSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/complete-profile', validate(completeProfileSchema), completeProfile);

export default router;