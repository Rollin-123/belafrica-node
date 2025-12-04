import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();
const adminController = new AdminController();

// Routes admin
router.post('/generate-code', authMiddleware, adminMiddleware, (req, res) => 
  adminController.generateAdminCode(req, res)
);

router.post('/validate-code', authMiddleware, (req, res) => 
  adminController.validateAdminCode(req, res)
);

router.get('/requests', authMiddleware, adminMiddleware, (req, res) => 
  adminController.getAdminRequests(req, res)
);

router.put('/requests/:id', authMiddleware, adminMiddleware, (req, res) => 
  adminController.updateRequestStatus(req, res)
);

export default router;