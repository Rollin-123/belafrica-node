"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseService = getSupabaseService;
// src/services/supabase.factory.ts
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const supabase_service_1 = require("./supabase.service");
let supabaseInstance = null;
function getSupabaseService() {
    if (!supabaseInstance) {
        supabaseInstance = new supabase_service_1.SupabaseService();
    }
    return supabaseInstance;
}
exports.default = supabase_service_1.SupabaseService;
//# sourceMappingURL=supabase.factory.js.map