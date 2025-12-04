"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Charger le fichier .env selon l'environnement
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), envFile) });
exports.config = {
    // Environnement
    env,
    port: parseInt(process.env.PORT || '3000'),
    // URLs Frontend
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL || 'https://zaaubhewtugkgsuoxgqi.supabase.co',
        anonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || 'your-service-key'
    },
    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'your-jwt-secret-change-this',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    // Telegram
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || 'your-bot-token',
        creatorChatId: process.env.TELEGRAM_CREATOR_CHAT_ID || 'your-chat-id'
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
function validateConfig() {
    const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
    for (const key of required) {
        if (!process.env[key]) {
            console.error(`❌ Variable d'environnement manquante: ${key}`);
            process.exit(1);
        }
    }
    console.log(`✅ Configuration chargée pour l'environnement: ${env}`);
}
//# sourceMappingURL=environments.js.map