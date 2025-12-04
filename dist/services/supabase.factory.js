"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseService = getSupabaseService;
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