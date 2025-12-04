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
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 10000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERREUR: Variables Supabase manquantes dans .env');
    console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_KEY:', supabaseKey ? '✓' : '✗');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté:', supabaseUrl);
async function detectLocation(ip) {
    try {
        let clientIP = ip;
        if (!clientIP && process.env.NODE_ENV === 'production') {
            return {
                country: 'Inconnu',
                countryCode: 'XX'
            };
        }
        const response = await axios_1.default.get(`http://ip-api.com/json/${clientIP}`, {
            timeout: 5000
        });
        if (response.data.status === 'success') {
            return {
                country: response.data.country,
                countryCode: response.data.countryCode
            };
        }
        return {
            country: 'Inconnu',
            countryCode: 'XX'
        };
    }
    catch (error) {
        console.error('❌ Erreur géolocalisation:', error);
        return {
            country: 'Inconnu',
            countryCode: 'XX'
        };
    }
}
function validatePhoneCountry(phoneCountryCode, detectedCountryCode) {
    const countryMapping = {
        '+33': ['FR'],
        '+32': ['BE'],
        '+49': ['DE'],
        '+39': ['IT'],
        '+34': ['ES'],
        '+41': ['CH'],
        '+44': ['GB'],
        '+1': ['CA', 'US'],
        '+7': ['RU', 'KZ'],
        '+375': ['BY']
    };
    const allowedCountries = countryMapping[phoneCountryCode];
    if (!allowedCountries) {
        console.warn(`⚠️ Code téléphone non mappé: ${phoneCountryCode}`);
        return true;
    }
    const isValid = allowedCountries.includes(detectedCountryCode);
    console.log('🌍 Validation pays:', {
        phoneCode: phoneCountryCode,
        detected: detectedCountryCode,
        allowed: allowedCountries,
        isValid
    });
    return isValid;
}
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
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200
});
app.use('/api/', limiter);
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});
app.post('/api/auth/request-otp', async (req, res) => {
    try {
        const { phoneNumber, countryCode } = req.body;
        console.log('📱 Demande OTP reçue:', {
            phoneNumber,
            countryCode,
            ip: req.ip,
            headers: req.headers
        });
        if (!phoneNumber || !countryCode) {
            return res.status(400).json({
                success: false,
                error: 'Numéro de téléphone et code pays requis'
            });
        }
        const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
        const location = await detectLocation(req.ip);
        console.log('📍 Localisation détectée:', location);
        const isValidCountry = validatePhoneCountry(countryCode, location.countryCode);
        if (!isValidCountry && location.country !== 'Inconnu') {
            console.log('❌ Validation pays échouée:', {
                phoneCode: countryCode,
                detected: location.countryCode,
                country: location.country
            });
            return res.status(403).json({
                success: false,
                error: `Accès refusé. Votre localisation (${location.country}) ne correspond pas au code pays ${countryCode}.`,
                detectedCountry: location.country,
                phoneCountryCode: countryCode,
                location: location
            });
        }
        console.log('✅ Validation pays réussie:', {
            phoneCode: countryCode,
            detected: location.countryCode,
            country: location.country
        });
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id, pseudo, community')
            .eq('phone_number', fullPhoneNumber)
            .single();
        if (userError && userError.code !== 'PGRST116') {
            console.error('❌ Erreur Supabase:', userError);
        }
        if (existingUser) {
            console.log('👤 Utilisateur existant trouvé:', existingUser.pseudo);
            return res.json({
                success: true,
                message: 'Utilisateur existant',
                userExists: true,
                requiresOTP: true,
                phoneNumber: fullPhoneNumber,
                detectedCountry: location.country
            });
        }
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const { error: otpError } = await supabase
            .from('otp_codes')
            .insert([{
                phone_number: fullPhoneNumber,
                code: otpCode,
                expires_at: expiresAt.toISOString(),
                created_at: new Date().toISOString()
            }]);
        if (otpError) {
            console.error('❌ Erreur sauvegarde OTP:', otpError);
        }
        else {
            console.log('✅ OTP sauvegardé dans Supabase');
        }
        console.log(`🔑 OTP généré: ${otpCode} pour ${fullPhoneNumber}`);
        res.json({
            success: true,
            message: 'OTP envoyé',
            code: otpCode,
            phoneNumber: fullPhoneNumber,
            expiresIn: '10 minutes',
            detectedCountry: location.country,
            countryCode: location.countryCode
        });
    }
    catch (error) {
        console.error('❌ Erreur requestOTP:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        console.log('🔐 Vérification OTP:', { phoneNumber, code });
        if (!phoneNumber || !code) {
            return res.status(400).json({
                success: false,
                error: 'Numéro et code requis'
            });
        }
        const { data: otpData, error: otpError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('phone_number', phoneNumber)
            .eq('code', code)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .single();
        if (otpError) {
            console.log('❌ OTP non trouvé ou déjà utilisé');
            if (process.env.NODE_ENV === 'development') {
                console.log('🔧 Mode développement: Vérification simplifiée');
                if (code.length === 6 && !isNaN(parseInt(code))) {
                    console.log('✅ OTP validé (mode développement)');
                    const { data: existingUser } = await supabase
                        .from('users')
                        .select('*')
                        .eq('phone_number', phoneNumber)
                        .single();
                    if (existingUser) {
                        const token = `belafrica_${existingUser.id}_${Date.now()}`;
                        return res.json({
                            success: true,
                            verified: true,
                            token: token,
                            user: {
                                id: existingUser.id,
                                pseudo: existingUser.pseudo,
                                community: existingUser.community,
                                isAdmin: existingUser.is_admin
                            },
                            isNewUser: false,
                            message: 'Connexion réussie'
                        });
                    }
                    return res.json({
                        success: true,
                        verified: true,
                        message: 'OTP vérifié avec succès',
                        phoneNumber: phoneNumber,
                        isNewUser: true
                    });
                }
            }
            return res.status(401).json({
                success: false,
                error: 'Code OTP invalide ou expiré'
            });
        }
        await supabase
            .from('otp_codes')
            .update({ verified: true, updated_at: new Date().toISOString() })
            .eq('id', otpData.id);
        console.log('✅ OTP validé dans Supabase pour:', phoneNumber);
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', phoneNumber)
            .single();
        if (existingUser) {
            const token = `belafrica_${existingUser.id}_${Date.now()}`;
            return res.json({
                success: true,
                verified: true,
                token: token,
                user: {
                    id: existingUser.id,
                    pseudo: existingUser.pseudo,
                    community: existingUser.community,
                    isAdmin: existingUser.is_admin
                },
                isNewUser: false,
                message: 'Connexion réussie'
            });
        }
        res.json({
            success: true,
            verified: true,
            message: 'OTP vérifié avec succès',
            phoneNumber: phoneNumber,
            isNewUser: true
        });
    }
    catch (error) {
        console.error('❌ Erreur verifyOTP:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
app.post('/api/auth/complete-profile', async (req, res) => {
    try {
        const profileData = req.body;
        console.log('👤 Création profil:', profileData);
        const requiredFields = ['phoneNumber', 'countryCode', 'nationality', 'nationalityName', 'pseudo', 'email', 'community'];
        for (const field of requiredFields) {
            if (!profileData[field]) {
                return res.status(400).json({
                    success: false,
                    error: `Champ manquant: ${field}`
                });
            }
        }
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('phone_number', profileData.phoneNumber)
            .single();
        if (userError && userError.code !== 'PGRST116') {
            console.error('❌ Erreur vérification utilisateur:', userError);
        }
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Un utilisateur avec ce numéro existe déjà'
            });
        }
        const userData = {
            phone_number: profileData.phoneNumber,
            country_code: profileData.countryCode,
            country_name: profileData.countryName || 'Inconnu',
            nationality: profileData.nationality,
            nationality_name: profileData.nationalityName,
            pseudo: profileData.pseudo,
            email: profileData.email,
            avatar_url: profileData.avatar || null,
            community: profileData.community,
            is_admin: false,
            is_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        console.log('📋 Insertion dans Supabase:', userData);
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
        if (insertError) {
            console.error('❌ Erreur création utilisateur:', insertError);
            return res.status(500).json({
                success: false,
                error: `Erreur création utilisateur: ${insertError.message}`,
                details: insertError
            });
        }
        console.log('✅ Utilisateur créé dans Supabase:', newUser.id);
        const token = `belafrica_${newUser.id}_${Date.now()}`;
        res.json({
            success: true,
            token: token,
            user: {
                id: newUser.id,
                pseudo: newUser.pseudo,
                community: newUser.community,
                isAdmin: newUser.is_admin,
                avatar: newUser.avatar_url,
                phoneNumber: newUser.phone_number
            },
            message: 'Profil créé avec succès'
        });
    }
    catch (error) {
        console.error('❌ Erreur completeProfile:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur création profil',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
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
            supabaseError: error?.message,
            ip: req.ip,
            url: 'https://belafrica-backend.onrender.com'
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
});
app.get('/api/test-geo', async (req, res) => {
    try {
        const location = await detectLocation(req.ip);
        res.json({
            success: true,
            ip: req.ip,
            location: location,
            headers: {
                'x-forwarded-for': req.headers['x-forwarded-for'],
                'x-real-ip': req.headers['x-real-ip']
            },
            message: 'Test géolocalisation'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur géolocalisation',
            details: error.message
        });
    }
});
app.get('/api/users', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (error)
            throw error;
        res.json({
            success: true,
            count: users?.length || 0,
            users: users
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.delete('/api/debug/clean', async (req, res) => {
    try {
        const { error: otpError } = await supabase
            .from('otp_codes')
            .delete()
            .lt('expires_at', new Date().toISOString());
        res.json({
            success: true,
            message: 'Données nettoyées'
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
        success: false,
        error: 'Route non trouvée',
        path: req.originalUrl,
        method: req.method,
        availableRoutes: [
            'POST /api/auth/request-otp',
            'POST /api/auth/verify-otp',
            'POST /api/auth/complete-profile',
            'GET /api/health',
            'GET /api/test-geo',
            'GET /api/users'
        ]
    });
});
app.use((err, req, res, next) => {
    console.error('🔥 Erreur serveur:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Erreur interne du serveur',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Serveur BELAFRICA démarré sur le port ${PORT}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: https://belafrica-backend.onrender.com/api/health`);
    console.log(`📍 Test géolocalisation: https://belafrica-backend.onrender.com/api/test-geo`);
    console.log(`📱 Test OTP: POST https://belafrica-backend.onrender.com/api/auth/request-otp`);
});
//# sourceMappingURL=server.js.map