"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_schema_1 = require("../schemas/auth.schema");
const router = (0, express_1.Router)();
router.post('/request-otp', (0, validate_middleware_1.validate)(auth_schema_1.requestOtpSchema), auth_controller_1.requestOtp);
router.post('/verify-otp', (0, validate_middleware_1.validate)(auth_schema_1.verifyOtpSchema), auth_controller_1.verifyOtp);
router.post('/complete-profile', (0, validate_middleware_1.validate)(auth_schema_1.completeProfileSchema), auth_controller_1.completeProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map