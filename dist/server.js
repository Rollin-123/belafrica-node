"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const supabase_js_1 = require("@supabase/supabase-js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables Supabase manquantes dans .env');
    console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('SUPABASE_KEY:', supabaseKey ? '✅' : '❌');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté:', supabaseUrl);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: ['http://localhost:4200', 'https://belafrica-version1.netlify.app'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200
});
app.use('/api/', limiter);
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});
app.get('/api/health', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'BELAFRICA Backend',
            environment: process.env.NODE_ENV || 'development',
            supabase: error ? 'ERROR' : 'CONNECTED',
            nodeVersion: process.version,
            memory: process.memoryUsage()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
});
app.post('/api/auth/request-otp', async (req, res) => {
    try {
        const { phoneNumber, countryCode } = req.body;
        console.log('📱 OTP demandé pour:', phoneNumber);
        if (!phoneNumber || !countryCode) {
            return res.status(400).json({
                success: false,
                error: 'Numéro et code pays requis'
            });
        }
        const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, pseudo')
            .eq('phone_number', fullPhoneNumber)
            .single();
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        res.json({
            success: true,
            message: 'OTP généré',
            code: otpCode,
            phoneNumber: fullPhoneNumber,
            userExists: !!existingUser,
            expiresIn: 600
        });
    }
    catch (error) {
        console.error('❌ Erreur OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});
app.post('/api/auth/complete-profile', async (req, res) => {
    try {
        const userData = req.body;
        console.log('👤 Création utilisateur:', userData);
        if (!userData.phoneNumber || !userData.pseudo) {
            return res.status(400).json({
                success: false,
                error: 'Données manquantes'
            });
        }
        const { data, error } = await supabase
            .from('users')
            .insert([{
                phone_number: userData.phoneNumber,
                country_code: userData.countryCode || '+33',
                country_name: userData.countryName || 'France',
                nationality: userData.nationality || 'FR',
                nationality_name: userData.nationalityName || 'Français',
                pseudo: userData.pseudo,
                email: userData.email || null,
                avatar_url: userData.avatar || null,
                community: userData.community || 'TestCommunity',
                is_admin: false,
                is_verified: true,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) {
            console.error('❌ Erreur Supabase:', error);
            return res.status(500).json({
                success: false,
                error: `Erreur base de données: ${error.message}`
            });
        }
        console.log('✅ Utilisateur créé:', data.id);
        res.json({
            success: true,
            user: {
                id: data.id,
                pseudo: data.pseudo,
                community: data.community,
                phoneNumber: data.phone_number
            },
            message: 'Utilisateur créé avec succès'
        });
    }
    catch (error) {
        console.error('❌ Erreur création:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error)
            throw error;
        res.json({
            success: true,
            count: data?.length || 0,
            users: data
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        availableRoutes: [
            'GET  /api/health',
            'POST /api/auth/request-otp',
            'POST /api/auth/complete-profile',
            'GET  /api/users'
        ]
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`✅ Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Supabase: ${supabaseUrl ? 'CONNECTÉ' : 'ERREUR'}`);
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});
//# sourceMappingURL=server.js.map