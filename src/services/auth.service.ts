import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environments';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

export class AuthService {
  async findUserByPhone(phoneNumber: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Erreur recherche utilisateur:', error);
      return null;
    }
  }

  async saveOTP(phoneNumber: string, code: string) {
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      const { error } = await supabase
        .from('otp_codes')
        .insert([{
          phone_number: phoneNumber,
          code,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde OTP:', error);
      return false;
    }
  }

  async verifyOTP(phoneNumber: string, code: string) {
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
          return false; // Aucun OTP valide trouvé
        }
        throw error;
      }

      // Marquer comme vérifié
      await supabase
        .from('otp_codes')
        .update({ verified: true })
        .eq('id', data.id);

      return true;
    } catch (error) {
      console.error('❌ Erreur vérification OTP:', error);
      return false;
    }
  }

  async createUser(userData: any) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('❌ Erreur création utilisateur:', error);
      throw new Error(`Erreur création utilisateur: ${error.message}`);
    }
  }
}