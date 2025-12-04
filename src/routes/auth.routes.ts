import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// ✅ Routes existantes
router.post('/request-otp', (req, res) => {
  authController.requestOTP(req, res);
});

router.post('/verify-otp', (req, res) => {
  authController.verifyOTP(req, res);
});

router.post('/complete-profile', (req, res) => {
  authController.completeProfile(req, res);
});

router.get('/verify-token', authMiddleware, (req, res) => { 
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token && token.startsWith('belafrica_')) {
    res.json({
      success: true,
      valid: true,
      message: 'Token valide'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Token invalide'
    });
  }
});

export default router;