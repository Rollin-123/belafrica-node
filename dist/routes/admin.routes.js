"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/admin.routes.ts
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Seuls les admins peuvent générer des codes pour d'autres admins
router.post('/generate-code', auth_middleware_1.protect, auth_middleware_1.isAdmin, admin_controller_1.generateAdminCode);
// Un utilisateur connecté peut essayer de valider un code pour devenir admin
router.post('/validate-code', auth_middleware_1.protect, admin_controller_1.validateAdminCode);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map