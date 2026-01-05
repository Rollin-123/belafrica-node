// src/services/supabase.factory.ts
import { SupabaseService } from './supabase.service';

let supabaseInstance: SupabaseService | null = null;

export function getSupabaseService(): SupabaseService {
  if (!supabaseInstance) {
    supabaseInstance = new SupabaseService();
  }
  return supabaseInstance;
}

export default SupabaseService;