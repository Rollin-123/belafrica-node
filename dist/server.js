"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts 
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const supabase_1 = require("./utils/supabase");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const debug_routes_1 = __importDefault(require("./routes/debug.routes"));
const post_routes_1 = __importDefault(require("./routes/post.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const telegram_service_1 = require("./services/telegram.service");
const app_controller_1 = require("./controllers/app.controller");
const messaging_routes_1 = __importDefault(require("./routes/messaging.routes"));
const http_1 = __importDefault(require("http"));
const socket_manager_1 = require("./services/socket.manager");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
    'http://localhost:4200',
    'https://belafrica-version1.netlify.app',
    'https://belafrica-backend.onrender.com'
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (allowedOrigins.includes(origin) || origin.endsWith('.netlify.app') || origin.endsWith('.onrender.com')) {
            callback(null, true);
        }
        else {
            console.warn(`🚫 Origine CORS non autorisée bloquée: ${origin}`);
            callback(new Error(`L'origine ${origin} n'est pas autorisée par la politique CORS.`));
        }
    },
    credentials: true,
};
(0, socket_manager_1.initializeSocketManager)(server, corsOptions);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200
});
app.use('/api/', limiter);
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});
app.get('/api/constants', app_controller_1.getAppConstants);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/debug', debug_routes_1.default);
app.use('/api/posts', post_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/messaging', messaging_routes_1.default);
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
app.use('*', (req, res) => {
    res.status(404).json({
        error: `Route non trouvée: ${req.method} ${req.originalUrl}`
    });
});
server.listen(PORT, () => {
    console.log(`✅ Serveur HTTP et Sockets démarrés sur le port ${PORT}`);
    console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
    (0, telegram_service_1.initializeTelegramBot)();
    console.log(`🌍 URL: https://belafrica-backend.onrender.com`);
    console.log(`📍 Test géolocalisation: GET /api/debug/geo`);
    console.log(`🔐 Test OTP: POST /api/auth/request-otp`);
});
//# sourceMappingURL=server.js.map