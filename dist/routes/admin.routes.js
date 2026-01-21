"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/generate-code', auth_middleware_1.protect, auth_middleware_1.isSuperAdmin, admin_controller_1.generateAdminCode);
router.get('/codes', auth_middleware_1.protect, auth_middleware_1.isSuperAdmin, admin_controller_1.getAdminCodes);
router.delete('/codes/:code', auth_middleware_1.protect, auth_middleware_1.isSuperAdmin, admin_controller_1.deleteAdminCode);
router.post('/validate-code', auth_middleware_1.protect, admin_controller_1.validateAdminCode);
router.post('/request-promotion', auth_middleware_1.protect, admin_controller_1.submitAdminPromotionRequest);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map