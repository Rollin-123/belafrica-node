"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Seuls les super-admins peuvent générer, voir et supprimer des codes
router.post('/generate-code', auth_middleware_1.protect, auth_middleware_1.isSuperAdmin, admin_controller_1.generateAdminCode);
router.get('/codes', auth_middleware_1.protect, auth_middleware_1.isSuperAdmin, admin_controller_1.getAdminCodes);
router.delete('/codes/:code', auth_middleware_1.protect, auth_middleware_1.isSuperAdmin, admin_controller_1.deleteAdminCode);
// N'importe quel utilisateur authentifié peut essayer de valider un code
router.post('/validate-code', auth_middleware_1.protect, admin_controller_1.validateAdminCode);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map