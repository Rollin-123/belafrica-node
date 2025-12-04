"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const environments_1 = require("./config/environments");
const supabase_js_1 = require("@supabase/supabase-js");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const posts_routes_1 = __importDefault(require("./routes/posts.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
(0, environments_1.validateConfig)();
const app = (0, express_1.default)();
const PORT = environments_1.config.port;
const supabase = (0, supabase_js_1.createClient)(environments_1.config.supabase.url, environments_1.config.supabase.serviceKey);
console.log('✅ Supabase connecté:', environments_1.config.supabase.url);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: environments_1.config.security.corsOrigin,
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: environments_1.config.security.rateLimitWindowMs,
    max: environments_1.config.security.rateLimitMaxRequests
});
app.use('/api/', limiter);
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});
app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/posts', posts_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'BELAFRICA Backend',
        environment: environments_1.config.env,
        version: '1.0.0'
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.originalUrl
    });
});
app.use((err, req, res, next) => {
    console.error('🔥 Erreur serveur:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Erreur interne du serveur',
        ...(environments_1.config.env === 'development' && { stack: err.stack })
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
    console.log(`🌍 Environnement: ${environments_1.config.env}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
//# sourceMappingURL=server.js.map