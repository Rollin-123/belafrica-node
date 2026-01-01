import { Router } from 'express';
import { generateAdminCode, validateAdminCode, getAdminCodes, deleteAdminCode, submitAdminPromotionRequest } from '../controllers/admin.controller';
import { protect, isSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// Seuls les super-admins peuvent générer, voir et supprimer des codes
router.post('/generate-code', protect, isSuperAdmin, generateAdminCode);
router.get('/codes', protect, isSuperAdmin, getAdminCodes);
router.delete('/codes/:code', protect, isSuperAdmin, deleteAdminCode);

// N'importe quel utilisateur authentifié peut essayer de valider un code
router.post('/validate-code', protect, validateAdminCode);

// ✅ NOUVEAU : Route pour qu'un utilisateur demande à devenir admin
router.post('/request-promotion', protect, submitAdminPromotionRequest);

export default router;