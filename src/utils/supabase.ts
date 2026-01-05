// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes. Assurez-vous que SUPABASE_URL et SUPABASE_SERVICE_KEY sont définies dans votre .env');
  process.exit(1);
}
export const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté');