/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environments';
import { randomUUID } from 'crypto';

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
      console.error('Erreur recherche utilisateur:', error);
      return null;
    }
  }

  async saveOTPWithToken(phoneNumber: string, code: string): Promise<{token: string, otpId: string}> {
    try {
      const token = randomUUID();
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
      console.error('Erreur sauvegarde OTP avec token:', error);
      throw error;
    }
  }

  async getOTPByToken(token: string) {
    try {
      const { data, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('token', token)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; 
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erreur recuperation OTP par token:', error);
      return null;
    }
  }

  async markOTPSent(token: string) {
    try {
      const { error } = await supabase
        .from('otp_codes')
        .update({ bot_sent: true })
        .eq('token', token);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur marquage OTP envoye:', error);
      return false;
    }
  }

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
        if (error.code !== 'PGRST116') throw error;
        return null;
      }

      await supabase
        .from('otp_codes')
        .update({ verified: true })
        .eq('id', data.id);

      return data;
    } catch (error) {
      console.error('Erreur verification OTP dans le service:', error);
      return null;
    }
  }

  async upsertUser(userData: any) {
    try {
      const { data: user, error: upsertError } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'phone_number' })
        .select()
        .single();

      if (upsertError) {
        console.error('Erreur Supabase upsertUser:', upsertError); 
        throw upsertError;
      }

      if (user) {
        const communityId = user.community;
        let { data: groupConversation, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('community', communityId)
          .eq('type', 'group')
          .single();

        if (convError && convError.code !== 'PGRST116') {
          console.error("Erreur recherche conversation de groupe:", convError);
          throw convError;
        }

        if (!groupConversation) {
          console.log('Creation de la conversation de groupe pour: ' + communityId);
          const { data: newConv, error: newConvError } = await supabase
            .from('conversations')
            .insert({
              name: 'Groupe ' + communityId,
              type: 'group',
              community: communityId,
              created_by: user.id
            })
            .select('id')
            .single();
          if (newConvError) throw newConvError;
          groupConversation = newConv;
        }

        const { error: participantError } = await supabase
          .from('conversation_participants')
          .upsert(
            { conversation_id: groupConversation.id, user_id: user.id },
            { onConflict: 'conversation_id,user_id' }
          );
        
        if (participantError) throw participantError;
      }

      return user;

    } catch (error: any) {
      console.error('Erreur serveur lors de la mise a jour du profil:', error);
      throw new Error('Erreur serveur lors de la mise a jour du profil.');
    }
  }
}
