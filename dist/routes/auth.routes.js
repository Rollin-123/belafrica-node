"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
router.post('/request-otp', (req, res) => authController.requestOTP(req, res));
router.post('/verify-otp', (req, res) => authController.verifyOTP(req, res));
router.post('/complete-profile', (req, res) => authController.completeProfile(req, res));
router.get('/verify-token', (req, res) => authController.verifyToken(req, res));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map