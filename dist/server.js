"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts - VERSION CORRIGÉE ET VÉRIFIÉE
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const supabase_1 = require("./utils/supabase");
// Import des routeurs
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const debug_routes_1 = __importDefault(require("./routes/debug.routes"));
const post_routes_1 = __importDefault(require("./routes/post.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
// ✅ Import du service Telegram
const telegram_service_1 = require("./services/telegram.service");
const app_controller_1 = require("./controllers/app.controller");
// Charger les variables d'environnement
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000; // Utiliser le port 3000 en local
// ✅ MIDDLEWARES
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:4200',
        'https://belafrica-version1.netlify.app',
        'https://belafrica.netlify.app',
        'https://*.netlify.app'
    ],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200
});
app.use('/api/', limiter);
// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});
// ✅ ROUTES
// La route pour les constantes doit être déclarée avant les autres groupes
app.get('/api/constants', app_controller_1.getAppConstants);
// Les autres groupes de routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/debug', debug_routes_1.default);
app.use('/api/posts', post_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// ✅ ROUTE: Health check
app.get('/api/health', async (req, res) => {
    try {
        const { error } = await supabase_1.supabase.from('users').select('id').limit(1);
        const supabaseStatus = error ? `ERROR: ${error.message}` : 'CONNECTED';
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            supabase: supabaseStatus
        });
    }
    catch (error) {
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});
// ✅ 404 Handler (doit être le DERNIER)
app.use('*', (req, res) => {
    res.status(404).json({
        error: `Route non trouvée: ${req.method} ${req.originalUrl}`
    });
});
// ✅ Démarrer serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
    (0, telegram_service_1.initializeTelegramBot)();
    console.log(`🌍 URL: https://belafrica-backend.onrender.com`);
    console.log(`📍 Test géolocalisation: GET /api/debug/geo`);
    console.log(`🔐 Test OTP: POST /api/auth/request-otp`);
});
//# sourceMappingURL=server.js.map