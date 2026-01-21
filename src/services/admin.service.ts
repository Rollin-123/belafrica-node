/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environments';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

export class AdminService {
  async generateAdminCode(community: string, permissions: string[] = ['post_national']) {
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); 
      const { data, error } = await supabase
        .from('admin_codes')
        .insert([{
          code,
          community,
          permissions,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, code: data };
    } catch (error: any) {
      console.error('❌ Erreur génération code admin:', error);
      return { success: false, error: error.message };
    }
  }

  async validateAdminCode(code: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('admin_codes')
        .select('*')
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        return { success: false, error: 'Code invalide ou expiré' };
      }

      await supabase
        .from('admin_codes')
        .update({
          used: true,
          used_by: userId,
          used_at: new Date().toISOString()
        })
        .eq('id', data.id);

      await supabase
        .from('users')
        .update({
          is_admin: true,
          admin_permissions: data.permissions,
          admin_level: data.permissions.includes('post_international') ? 'international' : 'national',
          admin_since: new Date().toISOString()
        })
        .eq('id', userId);

      return { 
        success: true, 
        permissions: data.permissions,
        community: data.community 
      };
    } catch (error: any) {
      console.error('❌ Erreur validation code admin:', error);
      return { success: false, error: error.message };
    }
  }
}