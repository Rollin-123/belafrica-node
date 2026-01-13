"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environment = void 0;
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
exports.environment = {
    production: true,
    appName: 'BELAFRICA',
    // ✅ UTILISER VOTRE VRAI BACKEND SUR RENDER
    apiUrl: 'https://belafrica-backend.onrender.com/api',
    apiVersion: 'v1',
    // Supabase
    supabaseUrl: 'https://zaaubhewtugkgsuoxgqi.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXViaGV3dHVna2dzdW94Z3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTUyNzYsImV4cCI6MjA4MDI3MTI3Nn0.-MzEVsGnC4QQc0z9wP14IOVi1CWaznF1omft_KZChYo',
    // Features
    enableAnalytics: false,
    enableLogging: true,
    // Timeouts
    requestTimeout: 30000,
    otpTimeout: 600000,
    // URLs
    telegramBot: 'https://t.me/Belafrica_bot',
    supportEmail: 'rollinloictianga@gmail.com'
};
//# sourceMappingURL=environment.prod.js.map