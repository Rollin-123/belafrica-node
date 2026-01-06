// src/services/supabase.factory.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { SupabaseService } from './supabase.service';

let supabaseInstance: SupabaseService | null = null;

export function getSupabaseService(): SupabaseService {
  if (!supabaseInstance) {
    supabaseInstance = new SupabaseService();
  }
  return supabaseInstance;
}

export default SupabaseService;