import { Router } from 'express';
import { generateAdminCode, validateAdminCode, getAdminCodes, deleteAdminCode } from '../controllers/admin.controller';
import { protect, isSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// Seuls les super-admins peuvent générer, voir et supprimer des codes
router.post('/generate-code', protect, isSuperAdmin, generateAdminCode);
router.get('/codes', protect, isSuperAdmin, getAdminCodes);
router.delete('/codes/:code', protect, isSuperAdmin, deleteAdminCode);

// N'importe quel utilisateur authentifié peut essayer de valider un code
router.post('/validate-code', protect, validateAdminCode);

export default router;