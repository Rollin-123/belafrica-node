/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

// src/utils/config.ts
import dotenv from 'dotenv';
import path from 'path';

// Charger le fichier .env selon l'environnement
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const config = {
  // Environnement
  env,
  port: parseInt(process.env.PORT || '3000'),
  
  // URLs Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || 'https://zaaubhewtugkgsuoxgqi.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXViaGV3dHVna2dzdW94Z3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTUyNzYsImV4cCI6MjA4MDI3MTI3Nn0.-MzEVsGnC4QQc0z9wP14IOVi1CWaznF1omft_KZChYo',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || 'sb_secret_gtnW7dfp70STMtSBD7TrYQ_s7k-3j80'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'belafrica_je_vous_promet_lsdosodeohfoheofhod_kdvdhhdldhlj_puissament_fortskjdhskjdhksjdh_thank_2025_change_this_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '8407730360:AAGRTq8xz7zO9ZS-TM7nVZtr409TAZW8nFM',
    creatorChatId: process.env.TELEGRAM_CREATOR_CHAT_ID || '7486840834'
  },
  
  // Sécurité
  security: {
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'],
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validation de la configuration
export function validateConfig() {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
  
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ Variable d'environnement manquante: ${key}`);
      process.exit(1);
    }
  }
  
  console.log(`✅ Configuration chargée pour l'environnement: ${env}`);
}
