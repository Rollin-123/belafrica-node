// src/routes/admin.routes.ts
import { Router } from 'express';
import { generateAdminCode, validateAdminCode } from '../controllers/admin.controller';
import { protect, isAdmin } from '../middleware/auth.middleware';

const router = Router();

// Seuls les admins peuvent générer des codes pour d'autres admins
router.post('/generate-code', protect, isAdmin, generateAdminCode);

// Un utilisateur connecté peut essayer de valider un code pour devenir admin
router.post('/validate-code', protect, validateAdminCode);

export default router;