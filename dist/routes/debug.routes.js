"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/debug.routes.ts
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const express_1 = require("express");
const debug_controller_1 = require("../controllers/debug.controller");
const router = (0, express_1.Router)();
router.get('/geo', debug_controller_1.getGeoDebug);
router.post('/test-validation', debug_controller_1.postTestValidation);
exports.default = router;
//# sourceMappingURL=debug.routes.js.map