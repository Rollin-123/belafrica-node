"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/debug.routes.ts
const express_1 = require("express");
const debug_controller_1 = require("../controllers/debug.controller");
const router = (0, express_1.Router)();
router.get('/geo', debug_controller_1.getGeoDebug);
router.post('/test-validation', debug_controller_1.postTestValidation);
exports.default = router;
//# sourceMappingURL=debug.routes.js.map