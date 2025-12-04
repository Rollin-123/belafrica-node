"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const environments_1 = require("../config/environments");
const supabase = (0, supabase_js_1.createClient)(environments_1.config.supabase.url, environments_1.config.supabase.serviceKey);
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
    async saveOTP(phoneNumber, code) {
        try {
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            const { error } = await supabase
                .from('otp_codes')
                .insert([{
                    phone_number: phoneNumber,
                    code,
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }]);
            if (error)
                throw error;
            return true;
        }
        catch (error) {
            console.error('❌ Erreur sauvegarde OTP:', error);
            return false;
        }
    }
    async verifyOTP(phoneNumber, code) {
        try {
            const { data, error } = await supabase
                .from('otp_codes')
                .select('*')
                .eq('phone_number', phoneNumber)
                .eq('code', code)
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString())
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                throw error;
            }
            await supabase
                .from('otp_codes')
                .update({ verified: true })
                .eq('id', data.id);
            return true;
        }
        catch (error) {
            console.error('❌ Erreur vérification OTP:', error);
            return false;
        }
    }
    async createUser(userData) {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('❌ Erreur création utilisateur:', error);
            throw new Error(`Erreur création utilisateur: ${error.message}`);
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map