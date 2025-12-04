import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// Routes d'authentification
router.post('/request-otp', (req, res) => authController.requestOTP(req, res));
router.post('/verify-otp', (req, res) => authController.verifyOTP(req, res));
router.post('/complete-profile', (req, res) => authController.completeProfile(req, res));
router.get('/verify-token', (req, res) => authController.verifyToken(req, res));

export default router;