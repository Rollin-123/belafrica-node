import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();
const adminController = new AdminController();

router.post('/generate-code', authMiddleware, adminMiddleware, (req, res) => {
  adminController.generateCode(req, res); 
});

router.post('/validate-code', authMiddleware, (req, res) => {
  adminController.validateCode(req, res);  
});

router.get('/requests', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Fonctionnalité à venir',
    requests: []
  });
});

router.put('/requests/:id', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Fonctionnalité à venir',
    requestId: req.params.id,
    status: 'updated'
  });
});

export default router;