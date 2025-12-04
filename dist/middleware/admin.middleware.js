"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = adminMiddleware;
const supabase_service_1 = require("../services/supabase.service");
async function adminMiddleware(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                error: 'Non authentifié'
            });
        }
        const supabase = (0, supabase_service_1.getSupabaseService)();
        const user = await supabase.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'Utilisateur non trouvé'
            });
        }
        if (!user.is_admin) {
            return res.status(403).json({
                error: 'Permissions administrateur requises'
            });
        }
        // Vérifier les permissions spécifiques si nécessaire
        const requiredPermission = req.requiredPermission;
        if (requiredPermission && user.admin_permissions) {
            if (!user.admin_permissions.includes(requiredPermission)) {
                return res.status(403).json({
                    error: `Permission ${requiredPermission} requise`
                });
            }
        }
        next();
    }
    catch (error) {
        console.error('🔥 Erreur adminMiddleware:', error);
        return res.status(500).json({
            error: 'Erreur de vérification des permissions'
        });
    }
}
//# sourceMappingURL=admin.middleware.js.map