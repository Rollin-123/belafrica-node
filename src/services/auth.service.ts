/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environments';
import { v4 as uuidv4 } from 'uuid';

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

  /**
   * Sauvegarde un OTP avec un token de deep linking unique.
   * @param phoneNumber Le numéro de téléphone complet.
   * @param code Le code OTP généré.
   * @returns Un objet contenant le token et l'ID de l'OTP.
   */
  async saveOTPWithToken(phoneNumber: string, code: string): Promise<{token: string, otpId: string}> {
    try {
      const token = uuidv4();  
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

      if (error) throw error;
      return { token: token, otpId: data.id };
    } catch (error) {
      console.error('❌ Erreur sauvegarde OTP avec token:', error);
      throw error;
    }
  }

  /**
   * Récupère un OTP non vérifié et non expiré par son token.
   * Utilisé par le bot Telegram quand un utilisateur clique sur le lien.
   */
  async getOTPByToken(token: string) {
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
    } catch (error) {
      console.error('❌ Erreur récupération OTP par token:', error);
      return null;
    }
  }

  /**
   * Marque un OTP comme ayant été envoyé par le bot.
   * Empêche le renvoi multiple du code avec le même lien.
   */
  async markOTPSent(token: string) {
    try {
      const { error } = await supabase
        .from('otp_codes')
        .update({ bot_sent: true })
        .eq('token', token);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Erreur marquage OTP envoyé:', error);
      return false;
    }
  }

  /**
   * Vérifie un OTP et le marque comme utilisé.
   * @returns Les données de l'OTP si valide, sinon null.
   */
  async verifyOTP(phoneNumber: string, code: string): Promise<any | null> {
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
        // PGRST116 = 0 ligne trouvée, ce qui est normal pour un code invalide/expiré.
        if (error.code !== 'PGRST116') throw error;
        return null;
      }

      // Marquer comme vérifié pour empêcher la réutilisation
      await supabase
        .from('otp_codes')
        .update({ verified: true })
        .eq('id', data.id);

      return data;
    } catch (error) {
      console.error('❌ Erreur vérification OTP dans le service:', error);
      return null;
    }
  }

  /**
   * Crée ou met à jour un utilisateur dans la base de données.
   */
  async upsertUser(userData: any) {
    try {
      const { data: user, error: upsertError } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'phone_number' })
        .select()
        .single();

      if (upsertError) {
        console.error('❌ Erreur Supabase upsertUser:', upsertError); 
        throw upsertError;
      }

      // ✅ NOUVEAU : Logique pour rejoindre/créer la conversation de groupe
      if (user) {
        const communityId = user.community;
        let { data: groupConversation, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('community', communityId)
          .eq('type', 'group')
          .single();

        // PGRST116 = 0 rows, ce qui est normal si la conversation n'existe pas encore.
        if (convError && convError.code !== 'PGRST116') {
          console.error("Erreur recherche conversation de groupe:", convError);
          throw convError;
        }

        // Si la conversation n'existe pas, on la crée
        if (!groupConversation) {
          console.log(`💬 Création de la conversation de groupe pour la communauté: ${communityId}`);
          const { data: newConv, error: newConvError } = await supabase
            .from('conversations')
            .insert({
              name: `Groupe ${communityId}`,
              type: 'group',
              community: communityId,
              created_by: user.id
            })
            .select('id')
            .single();
          if (newConvError) throw newConvError;
          groupConversation = newConv;
        }

        // Ajouter l'utilisateur comme participant
        const { error: participantError } = await supabase
          .from('conversation_participants')
          .upsert({ conversation_id: groupConversation.id, user_id: user.id }, { onConflict: 'conversation_id,user_id' });
        
        if (participantError) throw participantError;
      }

      return user;

    } catch (error: any) {
      console.error(`❌ Erreur serveur lors de la mise à jour du profil:`, error);
      throw new Error(`Erreur serveur lors de la mise à jour du profil.`);
    }
  }
}