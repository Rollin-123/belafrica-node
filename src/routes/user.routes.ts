// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller'; 
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// Routes utilisateur
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.put('/profile/avatar', authMiddleware, userController.updateAvatar);
router.get('/community', authMiddleware, userController.getCommunityUsers);
router.get('/:id', authMiddleware, userController.getUserById);

export default router;
export { UserController };