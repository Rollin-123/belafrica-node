"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = (0, express_1.Router)();
const adminController = new admin_controller_1.AdminController();
router.post('/generate-code', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, (req, res) => {
    adminController.generateCode(req, res);
});
router.post('/validate-code', auth_middleware_1.authMiddleware, (req, res) => {
    adminController.validateCode(req, res);
});
router.get('/requests', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Fonctionnalité à venir',
        requests: []
    });
});
router.put('/requests/:id', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Fonctionnalité à venir',
        requestId: req.params.id,
        status: 'updated'
    });
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map