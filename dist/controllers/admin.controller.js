"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("../services/admin.service");
class AdminController {
    constructor() {
        this.adminService = new admin_service_1.AdminService();
    }
    async generateCode(req, res) {
        try {
            const { community, permissions } = req.body;
            if (!community) {
                return res.status(400).json({
                    success: false,
                    error: 'Communauté requise'
                });
            }
            const result = await this.adminService.generateAdminCode(community, permissions);
            if (result.success) {
                res.json({
                    success: true,
                    code: result.code,
                    message: 'Code admin généré'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        }
        catch (error) {
            console.error('❌ Erreur génération code admin:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne'
            });
        }
    }
    async validateCode(req, res) {
        try {
            const { code, userId } = req.body;
            if (!code || !userId) {
                return res.status(400).json({
                    success: false,
                    error: 'Code et userId requis'
                });
            }
            const result = await this.adminService.validateAdminCode(code, userId);
            if (result.success) {
                res.json({
                    success: true,
                    valid: true,
                    permissions: result.permissions,
                    message: 'Code admin validé'
                });
            }
            else {
                res.status(401).json({
                    success: false,
                    error: result.error
                });
            }
        }
        catch (error) {
            console.error('❌ Erreur validation code admin:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne'
            });
        }
    }
    async getAdminRequests(req, res) {
        try {
            const supabase = req.supabase;
            const userId = req.userId;
            // Vérifier que l'utilisateur est admin
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', userId)
                .single();
            if (userError || !user?.is_admin) {
                return res.status(403).json({
                    success: false,
                    error: 'Permissions insuffisantes'
                });
            }
            const { data: requests, error } = await supabase
                .from('admin_requests')
                .select('*')
                .eq('status', 'pending')
                .order('submitted_at', { ascending: true });
            if (error)
                throw error;
            res.json({
                success: true,
                requests: requests || []
            });
        }
        catch (error) {
            console.error('❌ Erreur récupération demandes admin:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async updateRequestStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const supabase = req.supabase;
            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Statut invalide'
                });
            }
            const { error } = await supabase
                .from('admin_requests')
                .update({
                status,
                reviewed_at: new Date().toISOString()
            })
                .eq('id', id);
            if (error)
                throw error;
            res.json({
                success: true,
                message: `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}`
            });
        }
        catch (error) {
            console.error('❌ Erreur mise à jour demande:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map