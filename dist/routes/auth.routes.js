"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const geoip_middleware_1 = require("../middleware/geoip.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/request-otp', (0, geoip_middleware_1.verifyCountryByIp)('countryCode'), auth_controller_1.requestOtp);
router.post('/verify-otp', auth_controller_1.verifyOtp);
router.post('/complete-profile', auth_middleware_1.protectTemp, auth_controller_1.completeProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map