"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
router.post('/request-otp', (req, res) => {
    authController.requestOTP(req, res);
});
router.post('/verify-otp', (req, res) => {
    authController.verifyOTP(req, res);
});
router.post('/complete-profile', (req, res) => {
    authController.completeProfile(req, res);
});
router.get('/verify-token', auth_middleware_1.authMiddleware, (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && token.startsWith('belafrica_')) {
        res.json({
            success: true,
            valid: true,
            message: 'Token valide'
        });
    }
    else {
        res.status(401).json({
            success: false,
            error: 'Token invalide'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map