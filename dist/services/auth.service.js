"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const supabase_js_1 = require("@supabase/supabase-js");
const environments_1 = require("../config/environments");
const uuid_1 = require("uuid");
const supabase = (0, supabase_js_1.createClient)(environments_1.config.supabase.url, environments_1.config.supabase.serviceKey);
//@ts-ignore
class AuthService {
    async findUserByPhone(phoneNumber) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('phone_number', phoneNumber)
                .single();
            if (error && error.code !== 'PGRST116')
                throw error;
            return data;
        }
        catch (error) {
            console.error('❌ Erreur recherche utilisateur:', error);
            return null;
        }
    }
    /**
     * Sauvegarde un OTP avec un token de deep linking unique.
     * @param phoneNumber Le numéro de téléphone complet.
     * @param code Le code OTP généré.
     * @returns Un objet contenant le token et l'ID de l'OTP.
     */
    async saveOTPWithToken(phoneNumber, code) {
        try {
            const token = (0, uuid_1.v4)(); // Générer un token unique
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            const { data, error } = await supabase
                .from('otp_codes')
                .insert([{
                    phone_number: phoneNumber,
                    code,
                    token: token,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString(),
                    verified: false,
                    bot_sent: false
                }])
                .select()
                .single();
            if (error)
                throw error;
            return { token: token, otpId: data.id };
        }
        catch (error) {
            console.error('❌ Erreur sauvegarde OTP avec token:', error);
            throw error;
        }
    }
    /**
     * Récupère un OTP non vérifié et non expiré par son token.
     * Utilisé par le bot Telegram quand un utilisateur clique sur le lien.
     */
    async getOTPByToken(token) {
        try {
            const { data, error } = await supabase
                .from('otp_codes')
                .select('*')
                .eq('token', token)
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString()) // gt = greater than
                .single();
            if (error) {
                // 'PGRST116' est le code d'erreur de PostgREST pour "0 rows returned"
                // Ce n'est pas une vraie erreur, juste que le token est invalide ou expiré.
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }
            return data;
        }
        catch (error) {
            console.error('❌ Erreur récupération OTP par token:', error);
            return null;
        }
    }
    /**
     * Marque un OTP comme ayant été envoyé par le bot.
     * Empêche le renvoi multiple du code avec le même lien.
     */
    async markOTPSent(token) {
        try {
            const { error } = await supabase
                .from('otp_codes')
                .update({ bot_sent: true })
                .eq('token', token);
            if (error)
                throw error;
            return true;
        }
        catch (error) {
            console.error('❌ Erreur marquage OTP envoyé:', error);
            return false;
        }
    }
    /**
     * Vérifie un OTP et le marque comme utilisé.
     * @returns Les données de l'OTP si valide, sinon null.
     */
    async verifyOTP(phoneNumber, code) {
        try {
            const { data, error } = await supabase
                .from('otp_codes')
                .select('*')
                .eq('phone_number', phoneNumber)
                .eq('code', code)
                .eq('verified', false) // Doit ne pas être déjà vérifié
                .gt('expires_at', new Date().toISOString()) // Doit ne pas être expiré
                .single();
            if (error) {
                // PGRST116 = 0 ligne trouvée, ce qui est normal pour un code invalide/expiré.
                if (error.code !== 'PGRST116')
                    throw error;
                return null;
            }
            // Marquer comme vérifié pour empêcher la réutilisation
            await supabase
                .from('otp_codes')
                .update({ verified: true })
                .eq('id', data.id);
            return data;
        }
        catch (error) {
            console.error('❌ Erreur vérification OTP dans le service:', error);
            return null;
        }
    }
    /**
     * Crée ou met à jour un utilisateur dans la base de données.
     */
    async upsertUser(userData) {
        try {
            const { data, error } = await supabase
                .from('users')
                .upsert(userData, { onConflict: 'phone_number' })
                .select()
                .single();
            if (error) {
                console.error('❌ Erreur Supabase upsertUser:', error); // Log détaillé de l'erreur Supabase
                throw error;
            }
            return data;
        }
        catch (error) {
            // Cette erreur sera maintenant plus générique pour le client, mais détaillée dans les logs serveur.
            throw new Error(`Erreur serveur lors de la mise à jour du profil.`);
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map