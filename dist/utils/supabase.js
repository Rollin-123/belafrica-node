"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
// src/utils/supabase.ts
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables Supabase manquantes. Assurez-vous que SUPABASE_URL et SUPABASE_SERVICE_KEY sont définies dans votre .env');
    process.exit(1);
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté');
//# sourceMappingURL=supabase.js.map