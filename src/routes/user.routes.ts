// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller'; 
import { protect } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// Routes utilisateur
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, userController.updateProfile);
router.put('/profile/avatar', protect, userController.updateAvatar);
router.get('/community', protect, userController.getCommunityUsers);
router.get('/:id', protect, userController.getUserById);

export default router;
export { UserController };