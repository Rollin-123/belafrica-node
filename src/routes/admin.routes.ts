/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Router } from 'express';
import { generateAdminCode, validateAdminCode, getAdminCodes, deleteAdminCode, submitAdminPromotionRequest } from '../controllers/admin.controller';
import { protect, isSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// Seuls les super-admins peuvent générer, voir et supprimer des codes
router.post('/generate-code', protect, isSuperAdmin, generateAdminCode);
router.get('/codes', protect, isSuperAdmin, getAdminCodes);
router.delete('/codes/:code', protect, isSuperAdmin, deleteAdminCode);
router.post('/validate-code', protect, validateAdminCode);
router.post('/request-promotion', protect, submitAdminPromotionRequest);

export default router;