// src/routes/user.routes.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Router } from 'express';
import { UserController } from '../controllers/user.controller'; 
import { protect } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, userController.updateProfile);
router.put('/profile/avatar', protect, userController.updateAvatar);
router.get('/community', protect, userController.getCommunityUsers);
router.get('/:id', protect, userController.getUserById);

export default router;
export { UserController };