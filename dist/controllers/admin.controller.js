"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("../services/admin.service");
class AdminController {
    constructor() {
        this.adminService = new admin_service_1.AdminService();
    }
    async generateAdminCode(req, res) {
        try {
            const { community, permissions, expiresInHours } = req.body;
            const userId = req.user?.id;
            if (!community || !permissions) {
                return res.status(400).json({
                    success: false,
                    error: 'Communauté et permissions requises'
                });
            }
            const result = await this.adminService.generateAdminCode(community, permissions, expiresInHours, userId);
            res.json(result);
        }
        catch (error) {
            console.error('🔥 Erreur generateAdminCode:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
    async validateAdminCode(req, res) {
        try {
            const { code } = req.body;
            const userId = req.user?.id;
            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: 'Code requis'
                });
            }
            const result = await this.adminService.validateAdminCode(code, userId);
            res.json(result);
        }
        catch (error) {
            console.error('🔥 Erreur validateAdminCode:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
    async getAdminRequests(req, res) {
        try {
            const requests = await this.adminService.getAdminRequests();
            res.json({
                success: true,
                requests
            });
        }
        catch (error) {
            console.error('🔥 Erreur getAdminRequests:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
    async updateRequestStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!id || !status) {
                return res.status(400).json({
                    success: false,
                    error: 'ID et status requis'
                });
            }
            const result = await this.adminService.updateRequestStatus(id, status);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        }
        catch (error) {
            console.error('🔥 Erreur updateRequestStatus:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map