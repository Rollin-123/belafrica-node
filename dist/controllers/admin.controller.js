"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAdminCode = exports.generateAdminCode = void 0;
const supabase_1 = require("../utils/supabase");
const crypto_1 = require("crypto");
/**
 * Génère un code d'administration.
 * Réservé aux super-administrateurs (logique de super-admin à définir, pour l'instant on se base sur is_admin).
 */
const generateAdminCode = async (req, res) => {
    try {
        const { community, permissions, expiresInHours } = req.body;
        const code = (0, crypto_1.randomBytes)(16).toString('hex');
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        const { data, error } = await supabase_1.supabase
            .from('admin_codes')
            .insert({
            code,
            community,
            permissions,
            expires_at: expiresAt.toISOString(),
            created_by: req.user?.userId,
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.generateAdminCode = generateAdminCode;
/**
 * Valide un code et promeut un utilisateur au rang d'administrateur.
 * Accessible par un utilisateur connecté.
 */
const validateAdminCode = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user?.userId;
        const { data: codeData, error: codeError } = await supabase_1.supabase
            .from('admin_codes')
            .select('*')
            .eq('code', code)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();
        if (codeError || !codeData) {
            return res.status(404).json({ success: false, error: 'Code invalide, expiré ou déjà utilisé.' });
        }
        // Mettre à jour l'utilisateur
        const { error: userUpdateError } = await supabase_1.supabase
            .from('users')
            .update({
            is_admin: true,
            admin_permissions: codeData.permissions,
        })
            .eq('id', userId);
        if (userUpdateError)
            throw userUpdateError;
        // Marquer le code comme utilisé
        await supabase_1.supabase.from('admin_codes').update({ used: true, used_by: userId, used_at: new Date().toISOString() }).eq('id', codeData.id);
        res.json({ success: true, message: 'Félicitations, vous êtes maintenant administrateur !' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.validateAdminCode = validateAdminCode;
//# sourceMappingURL=admin.controller.js.map