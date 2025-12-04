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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Charger les variables d'environnement
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 10000;
// ✅ INIT SUPABASE AVEC VALIDATION
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'belafrica_default_secret_2025_change_this';
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERREUR: Variables Supabase manquantes dans .env');
    console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_KEY:', supabaseKey ? '✓' : '✗');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté:', supabaseUrl);
// ✅ VARIABLE POUR ACTIVER/DÉSACTIVER LA VALIDATION GÉO
let GEO_VALIDATION_ENABLED = false;
// ✅ FONCTION: Obtenir l'IP RÉELLE du client
function getClientIP(req) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
        req.headers['x-real-ip']?.toString() ||
        req.socket.remoteAddress ||
        'unknown';
    return ip;
}
// ✅ FONCTION: Détection de pays par IP
async function detectCountryByIP(ip) {
    try {
        // IPs locales ou invalides
        if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
            return {
                country: 'Localhost',
                countryCode: 'XX',
                city: 'Local'
            };
        }
        // Service 1: ip-api.com
        try {
            const response = await axios_1.default.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city`, {
                timeout: 3000
            });
            if (response.data.status === 'success') {
                return {
                    country: response.data.country,
                    countryCode: response.data.countryCode,
                    city: response.data.city
                };
            }
        }
        catch (error) {
            console.log('⚠️ ip-api.com échoué');
        }
        // Fallback
        return {
            country: 'Inconnu',
            countryCode: 'XX',
            city: 'Inconnu'
        };
    }
    catch (error) {
        console.error('❌ Erreur géolocalisation:', error);
        return {
            country: 'Erreur',
            countryCode: 'XX',
            city: 'Erreur'
        };
    }
}
// ✅ FONCTION: Valider si le pays correspond au code téléphonique
function validateCountryForPhoneCode(phoneCode, detectedCountry, detectedCountryCode) {
    const phoneCodeToCountries = {
        '+33': { names: ['France'], codes: ['FR'] },
        '+32': { names: ['Belgique'], codes: ['BE'] },
        '+49': { names: ['Allemagne'], codes: ['DE'] },
        '+39': { names: ['Italie'], codes: ['IT'] },
        '+34': { names: ['Espagne'], codes: ['ES'] },
        '+41': { names: ['Suisse'], codes: ['CH'] },
        '+44': { names: ['Royaume-Uni', 'United Kingdom'], codes: ['GB'] },
        '+1': { names: ['Canada', 'États-Unis', 'United States'], codes: ['CA', 'US'] },
        '+7': { names: ['Russie', 'Kazakhstan'], codes: ['RU', 'KZ'] },
        '+375': { names: ['Biélorussie', 'Belarus'], codes: ['BY'] }
    };
    const countryInfo = phoneCodeToCountries[phoneCode];
    if (!countryInfo) {
        return {
            isValid: true,
            detectedCountry: detectedCountry,
            message: `Code ${phoneCode} non vérifié`
        };
    }
    const isValid = countryInfo.codes.includes(detectedCountryCode) ||
        countryInfo.names.some(name => detectedCountry.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(detectedCountry.toLowerCase()));
    if (!isValid) {
        return {
            isValid: false,
            detectedCountry: detectedCountry,
            message: `Votre localisation (${detectedCountry}) ne correspond pas au code pays ${phoneCode}. Pays autorisés: ${countryInfo.names.join(', ')}`
        };
    }
    return {
        isValid: true,
        detectedCountry: detectedCountry,
        message: `Localisation ${detectedCountry} validée`
    };
}
// ✅ FONCTION: Générer un token JWT
function generateToken(userId, community, isAdmin = false) {
    const payload = {
        userId,
        community,
        isAdmin,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET);
}
// ✅ FONCTION: Vérifier un token JWT
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
}
// ✅ MIDDLEWARE: Authentification
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Token d\'authentification manquant'
        });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            error: 'Token invalide ou expiré'
        });
    }
    req.user = decoded;
    next();
};
// ✅ MIDDLEWARE: Admin seulement
const adminOnly = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Accès réservé aux administrateurs'
        });
    }
    next();
};
// ✅ MIDDLEWARE: Logger détaillé
app.use((req, res, next) => {
    const clientIP = getClientIP(req);
    console.log(`📡 ${new Date().toISOString()} ${req.method} ${req.path}`, {
        ip: clientIP,
        userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    next();
});
// Middleware standard
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:4200',
        'https://belafrica-version1.netlify.app',
        'https://belafrica.netlify.app',
        'https://*.netlify.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        error: 'Trop de requêtes, veuillez réessayer plus tard'
    }
});
app.use('/api/', limiter);
// ✅ ROUTE: Demande OTP
app.post('/api/auth/request-otp', async (req, res) => {
    try {
        const { phoneNumber, countryCode } = req.body;
        if (!phoneNumber || !countryCode) {
            return res.status(400).json({
                success: false,
                error: 'Numéro de téléphone et code pays requis'
            });
        }
        const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
        const clientIP = getClientIP(req);
        // ✅ DÉTECTION DE LOCALISATION
        let location = await detectCountryByIP(clientIP);
        console.log('📍 Localisation détectée:', {
            ip: clientIP,
            location,
            phoneNumber: fullPhoneNumber
        });
        // ✅ VALIDATION GÉOLOCALISATION (SEULEMENT SI ACTIVÉE)
        if (GEO_VALIDATION_ENABLED && location.country !== 'Localhost') {
            const validation = validateCountryForPhoneCode(countryCode, location.country, location.countryCode);
            if (!validation.isValid) {
                return res.status(403).json({
                    success: false,
                    error: validation.message,
                    detectedCountry: location.country,
                    phoneCountryCode: countryCode,
                    code: 'GEO_VALIDATION_FAILED'
                });
            }
        }
        // ✅ VÉRIFIER SI UTILISATEUR EXISTE
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, pseudo, community, is_admin')
            .eq('phone_number', fullPhoneNumber)
            .single();
        if (existingUser) {
            return res.json({
                success: true,
                message: 'Utilisateur existant',
                userExists: true,
                requiresOTP: true,
                phoneNumber: fullPhoneNumber,
                detectedCountry: location.country
            });
        }
        // ✅ GÉNÉRER OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        // Sauvegarder OTP
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
        console.log(`🔑 OTP généré: ${otpCode} pour ${fullPhoneNumber}`);
        res.json({
            success: true,
            message: 'OTP envoyé',
            code: otpCode,
            phoneNumber: fullPhoneNumber,
            expiresIn: '10 minutes',
            detectedCountry: location.country,
            countryCode: location.countryCode,
            geoValidationEnabled: GEO_VALIDATION_ENABLED
        });
    }
    catch (error) {
        console.error('❌ Erreur requestOTP:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});
// ✅ ROUTE: Vérification OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) {
            return res.status(400).json({
                success: false,
                error: 'Numéro et code requis'
            });
        }
        // Vérifier OTP dans Supabase
        const { data: otpData } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('phone_number', phoneNumber)
            .eq('code', code)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .single();
        if (!otpData) {
            return res.status(401).json({
                success: false,
                error: 'Code OTP invalide ou expiré'
            });
        }
        // Marquer comme vérifié
        await supabase
            .from('otp_codes')
            .update({ verified: true, updated_at: new Date().toISOString() })
            .eq('id', otpData.id);
        // Vérifier si utilisateur existe
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', phoneNumber)
            .single();
        if (existingUser) {
            // Générer token
            const token = generateToken(existingUser.id, existingUser.community, existingUser.is_admin);
            return res.json({
                success: true,
                verified: true,
                token: token,
                user: {
                    id: existingUser.id,
                    pseudo: existingUser.pseudo,
                    community: existingUser.community,
                    isAdmin: existingUser.is_admin,
                    avatar: existingUser.avatar_url
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
            error: 'Erreur interne du serveur'
        });
    }
});
// ✅ ROUTE: Compléter profil
app.post('/api/auth/complete-profile', async (req, res) => {
    try {
        const profileData = req.body;
        // Validation
        const requiredFields = ['phoneNumber', 'countryCode', 'nationality', 'nationalityName', 'pseudo', 'email', 'community'];
        for (const field of requiredFields) {
            if (!profileData[field]) {
                return res.status(400).json({
                    success: false,
                    error: `Champ manquant: ${field}`
                });
            }
        }
        // Vérifier si existe déjà
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone_number', profileData.phoneNumber)
            .single();
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Un utilisateur avec ce numéro existe déjà'
            });
        }
        // Créer utilisateur
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
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
        if (insertError) {
            console.error('❌ Erreur création utilisateur:', insertError);
            return res.status(500).json({
                success: false,
                error: `Erreur création utilisateur: ${insertError.message}`
            });
        }
        // Générer token
        const token = generateToken(newUser.id, newUser.community, false);
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
            error: error.message || 'Erreur création profil'
        });
    }
});
// ✅ ROUTE: Vérifier token
app.get('/api/auth/verify-token', authenticate, (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Utilisateur non authentifié'
        });
    }
    res.json({
        success: true,
        user: req.user,
        valid: true,
        message: 'Token valide'
    });
});
// ✅ ROUTE: Obtenir profil utilisateur
app.get('/api/auth/profile', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.userId)
            .single();
        if (error) {
            throw error;
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                pseudo: user.pseudo,
                email: user.email,
                community: user.community,
                isAdmin: user.is_admin,
                avatar: user.avatar_url,
                phoneNumber: user.phone_number,
                nationality: user.nationality_name,
                country: user.country_name,
                createdAt: user.created_at
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ✅ ROUTE: Mettre à jour profil
app.put('/api/auth/profile', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { pseudo, email, avatar } = req.body;
        const updates = {};
        if (pseudo)
            updates.pseudo = pseudo;
        if (email)
            updates.email = email;
        if (avatar)
            updates.avatar_url = avatar;
        updates.updated_at = new Date().toISOString();
        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', req.user.userId)
            .select()
            .single();
        if (error) {
            throw error;
        }
        res.json({
            success: true,
            user: {
                pseudo: user.pseudo,
                email: user.email,
                avatar: user.avatar_url
            },
            message: 'Profil mis à jour'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ✅ ADMIN ROUTES
// ✅ ROUTE: Générer code admin
app.post('/api/admin/generate-code', authenticate, adminOnly, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { community, permissions, expiresInHours = 72 } = req.body;
        if (!community) {
            return res.status(400).json({
                success: false,
                error: 'Communauté requise'
            });
        }
        // Générer un code admin
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        const { error: insertError } = await supabase
            .from('admin_codes')
            .insert([{
                code: code,
                community: community,
                permissions: permissions || ['post_national'],
                expires_at: expiresAt.toISOString(),
                created_by: req.user.userId,
                created_at: new Date().toISOString()
            }]);
        if (insertError) {
            throw insertError;
        }
        res.json({
            success: true,
            code: code,
            community: community,
            permissions: permissions || ['post_national'],
            expiresIn: expiresInHours,
            expiresAt: expiresAt.toISOString(),
            message: 'Code admin généré'
        });
    }
    catch (error) {
        console.error('❌ Erreur génération code admin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne'
        });
    }
});
// ✅ ROUTE: Valider code admin
app.post('/api/admin/validate-code', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Code requis'
            });
        }
        // Vérifier le code dans Supabase
        const { data: adminCode, error } = await supabase
            .from('admin_codes')
            .select('*')
            .eq('code', code)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();
        if (error || !adminCode) {
            return res.status(401).json({
                success: false,
                error: 'Code admin invalide, expiré ou déjà utilisé'
            });
        }
        // Vérifier que l'utilisateur appartient à la bonne communauté
        const { data: user } = await supabase
            .from('users')
            .select('community')
            .eq('id', req.user.userId)
            .single();
        if (!user || user.community !== adminCode.community) {
            return res.status(403).json({
                success: false,
                error: 'Ce code ne correspond pas à votre communauté'
            });
        }
        // Mettre à jour l'utilisateur comme admin
        const { error: updateError } = await supabase
            .from('users')
            .update({
            is_admin: true,
            admin_permissions: adminCode.permissions,
            admin_level: adminCode.permissions.includes('post_international') ? 'international' : 'national',
            admin_since: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .eq('id', req.user.userId);
        if (updateError) {
            throw updateError;
        }
        // Marquer le code comme utilisé
        await supabase
            .from('admin_codes')
            .update({
            used: true,
            used_by: req.user.userId,
            used_at: new Date().toISOString()
        })
            .eq('id', adminCode.id);
        // Générer nouveau token avec les permissions admin
        const newToken = generateToken(req.user.userId, user.community, true);
        res.json({
            success: true,
            valid: true,
            token: newToken,
            permissions: adminCode.permissions,
            message: 'Code admin validé, vous êtes maintenant administrateur'
        });
    }
    catch (error) {
        console.error('❌ Erreur validation code admin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne'
        });
    }
});
// ✅ ROUTE: Soumettre demande admin
app.post('/api/admin/request', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { passportPhotoUrl, additionalInfo } = req.body;
        if (!passportPhotoUrl || !additionalInfo) {
            return res.status(400).json({
                success: false,
                error: 'Photo de passeport et informations requises'
            });
        }
        const { data: user } = await supabase
            .from('users')
            .select('pseudo, community, phone_number, email')
            .eq('id', req.user.userId)
            .single();
        const { error: insertError } = await supabase
            .from('admin_requests')
            .insert([{
                user_id: req.user.userId,
                passport_photo_url: passportPhotoUrl,
                additional_info: additionalInfo,
                status: 'pending',
                submitted_at: new Date().toISOString()
            }]);
        if (insertError) {
            throw insertError;
        }
        res.json({
            success: true,
            message: 'Demande d\'administration soumise avec succès'
        });
    }
    catch (error) {
        console.error('❌ Erreur soumission demande admin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne'
        });
    }
});
// ✅ POSTS ROUTES
// ✅ ROUTE: Créer un post
app.post('/api/posts', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { content, visibility, imageUrls } = req.body;
        if (!content || !visibility) {
            return res.status(400).json({
                success: false,
                error: 'Contenu et visibilité requis'
            });
        }
        // Vérifier que l'utilisateur est admin
        const { data: user } = await supabase
            .from('users')
            .select('is_admin, admin_permissions, community')
            .eq('id', req.user.userId)
            .single();
        if (!user || !user.is_admin) {
            return res.status(403).json({
                success: false,
                error: 'Permissions insuffisantes'
            });
        }
        // Vérifier les permissions
        if (visibility === 'national' && !user.admin_permissions?.includes('post_national')) {
            return res.status(403).json({
                success: false,
                error: 'Pas de permission pour poster dans le fil national'
            });
        }
        if (visibility === 'international' && !user.admin_permissions?.includes('post_international')) {
            return res.status(403).json({
                success: false,
                error: 'Pas de permission pour poster dans le fil international'
            });
        }
        // Calculer la date d'expiration
        const expiresAt = new Date(Date.now() + (visibility === 'national' ? 48 : 72) * 60 * 60 * 1000);
        const { data: newPost, error: insertError } = await supabase
            .from('posts')
            .insert([{
                author_id: req.user.userId,
                content: content,
                image_urls: imageUrls || [],
                visibility: visibility,
                community: user.community,
                expires_at: expiresAt.toISOString(),
                created_at: new Date().toISOString()
            }])
            .select(`
        *,
        author:users(pseudo, avatar_url)
      `)
            .single();
        if (insertError) {
            throw insertError;
        }
        res.json({
            success: true,
            post: {
                id: newPost.id,
                content: newPost.content,
                imageUrls: newPost.image_urls,
                visibility: newPost.visibility,
                authorName: newPost.author.pseudo,
                authorAvatar: newPost.author.avatar_url,
                createdAt: newPost.created_at,
                expiresAt: newPost.expires_at
            },
            message: 'Post créé avec succès'
        });
    }
    catch (error) {
        console.error('❌ Erreur création post:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne'
        });
    }
});
// ✅ ROUTE: Récupérer les posts nationaux
app.get('/api/posts/national', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { data: user } = await supabase
            .from('users')
            .select('community')
            .eq('id', req.user.userId)
            .single();
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
        *,
        author:users(pseudo, avatar_url),
        likes:post_likes(count)
      `)
            .eq('community', user.community)
            .eq('visibility', 'national')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });
        if (error) {
            throw error;
        }
        res.json({
            success: true,
            posts: posts.map(post => ({
                id: post.id,
                content: post.content,
                imageUrls: post.image_urls,
                authorName: post.author.pseudo,
                authorAvatar: post.author.avatar_url,
                visibility: post.visibility,
                likes: post.likes[0]?.count || 0,
                createdAt: post.created_at,
                expiresAt: post.expires_at
            })),
            community: user.community
        });
    }
    catch (error) {
        console.error('❌ Erreur récupération posts:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne'
        });
    }
});
// ✅ ROUTE: Récupérer les posts internationaux
app.get('/api/posts/international', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
        *,
        author:users(pseudo, avatar_url, community),
        likes:post_likes(count)
      `)
            .eq('visibility', 'international')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });
        if (error) {
            throw error;
        }
        res.json({
            success: true,
            posts: posts.map(post => ({
                id: post.id,
                content: post.content,
                imageUrls: post.image_urls,
                authorName: post.author.pseudo,
                authorAvatar: post.author.avatar_url,
                authorCommunity: post.author.community,
                visibility: post.visibility,
                likes: post.likes[0]?.count || 0,
                createdAt: post.created_at,
                expiresAt: post.expires_at
            }))
        });
    }
    catch (error) {
        console.error('❌ Erreur récupération posts internationaux:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne'
        });
    }
});
// ✅ ROUTE: Liker un post
app.post('/api/posts/:postId/like', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        const { postId } = req.params;
        // Vérifier si l'utilisateur a déjà liké
        const { data: existingLike } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', req.user.userId)
            .single();
        if (existingLike) {
            // Supprimer le like
            await supabase
                .from('post_likes')
                .delete()
                .eq('id', existingLike.id);
            return res.json({
                success: true,
                liked: false,
                message: 'Like retiré'
            });
        }
        // Ajouter le like
        await supabase
            .from('post_likes')
            .insert([{
                post_id: postId,
                user_id: req.user.userId,
                created_at: new Date().toISOString()
            }]);
        res.json({
            success: true,
            liked: true,
            message: 'Post liké'
        });
    }
    catch (error) {
        console.error('❌ Erreur like:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne'
        });
    }
});
// ✅ DEBUG & ADMIN ROUTES
// ✅ ROUTE: Debug géolocalisation
app.get('/api/debug/geo', async (req, res) => {
    try {
        const clientIP = getClientIP(req);
        const location = await detectCountryByIP(clientIP);
        res.json({
            success: true,
            request: {
                ip: clientIP,
                headers: {
                    'x-forwarded-for': req.headers['x-forwarded-for'],
                    'x-real-ip': req.headers['x-real-ip']
                }
            },
            location: location,
            geoValidationEnabled: GEO_VALIDATION_ENABLED,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ✅ ROUTE: Tester la validation
app.post('/api/debug/test-validation', async (req, res) => {
    try {
        const { phoneNumber, countryCode } = req.body;
        if (!phoneNumber || !countryCode) {
            return res.status(400).json({
                success: false,
                error: 'Numéro et code pays requis'
            });
        }
        const clientIP = getClientIP(req);
        const location = await detectCountryByIP(clientIP);
        const validation = validateCountryForPhoneCode(countryCode, location.country, location.countryCode);
        res.json({
            success: true,
            phoneNumber: `${countryCode}${phoneNumber.replace(/\D/g, '')}`,
            clientIP,
            location,
            validation,
            geoValidationEnabled: GEO_VALIDATION_ENABLED,
            expectedCountries: {
                '+375': 'Biélorussie',
                '+33': 'France',
                '+32': 'Belgique',
                '+34': 'Espagne',
                '+49': 'Allemagne',
                '+39': 'Italie',
                '+41': 'Suisse',
                '+44': 'Royaume-Uni',
                '+1': 'Canada/États-Unis',
                '+7': 'Russie/Kazakhstan'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ✅ ROUTE: Activer/désactiver validation géo (admin seulement)
app.post('/api/admin/toggle-geo-validation', authenticate, adminOnly, (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Utilisateur non authentifié'
        });
    }
    GEO_VALIDATION_ENABLED = !GEO_VALIDATION_ENABLED;
    res.json({
        success: true,
        geoValidationEnabled: GEO_VALIDATION_ENABLED,
        message: `Validation géolocalisation ${GEO_VALIDATION_ENABLED ? 'activée' : 'désactivée'}`
    });
});
// ✅ ROUTE: Nettoyer la base (admin seulement)
app.post('/api/admin/cleanup', authenticate, adminOnly, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        // Supprimer les OTPs expirés
        await supabase
            .from('otp_codes')
            .delete()
            .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        // Supprimer les posts expirés
        await supabase
            .from('posts')
            .delete()
            .lt('expires_at', new Date().toISOString());
        // Supprimer les codes admin expirés
        await supabase
            .from('admin_codes')
            .delete()
            .lt('expires_at', new Date().toISOString());
        res.json({
            success: true,
            message: 'Base de données nettoyée',
            cleaned: {
                otpCodes: 'OTPs expirés',
                posts: 'Posts expirés',
                adminCodes: 'Codes admin expirés'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ✅ ROUTE: Statistiques (admin seulement)
app.get('/api/admin/stats', authenticate, adminOnly, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non authentifié'
            });
        }
        // Compter les utilisateurs
        const { count: usersCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        // Compter les posts actifs
        const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .gt('expires_at', new Date().toISOString());
        // Compter les admins
        const { count: adminsCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_admin', true);
        // Récupérer les communautés
        const { data: communities } = await supabase
            .from('users')
            .select('community')
            .order('community');
        const uniqueCommunities = [...new Set(communities?.map(c => c.community))];
        res.json({
            success: true,
            stats: {
                users: usersCount || 0,
                activePosts: postsCount || 0,
                admins: adminsCount || 0,
                communities: uniqueCommunities.length,
                communityList: uniqueCommunities,
                geoValidationEnabled: GEO_VALIDATION_ENABLED
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ✅ HEALTH CHECK ROUTE
app.get('/api/health', async (req, res) => {
    try {
        // Tester la connexion Supabase
        const { data: testData, error: supabaseError } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        const supabaseStatus = supabaseError ? 'ERROR' : 'CONNECTED';
        res.json({
            status: 'OK',
            service: 'BELAFRICA Backend',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            supabase: {
                status: supabaseStatus,
                url: supabaseUrl ? '✓ Configured' : '✗ Missing',
                key: supabaseKey ? '✓ Configured' : '✗ Missing'
            },
            features: {
                jwt: JWT_SECRET !== 'belafrica_default_secret_2025_change_this' ? '✓ Configured' : '⚠️ Default',
                geoValidation: GEO_VALIDATION_ENABLED ? '✓ Enabled' : '✗ Disabled'
            },
            endpoints: [
                'POST /api/auth/request-otp',
                'POST /api/auth/verify-otp',
                'POST /api/auth/complete-profile',
                'GET /api/auth/profile',
                'POST /api/admin/validate-code',
                'GET /api/posts/national',
                'GET /api/posts/international',
                'GET /api/debug/geo',
                'GET /api/health'
            ]
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// ✅ ROUTE: Liste toutes les routes disponibles
app.get('/api/routes', (req, res) => {
    const routes = [
        // Auth
        { method: 'POST', path: '/api/auth/request-otp', description: 'Demander un code OTP' },
        { method: 'POST', path: '/api/auth/verify-otp', description: 'Vérifier un code OTP' },
        { method: 'POST', path: '/api/auth/complete-profile', description: 'Créer un profil utilisateur' },
        { method: 'GET', path: '/api/auth/profile', description: 'Récupérer le profil (authentifié)' },
        { method: 'PUT', path: '/api/auth/profile', description: 'Mettre à jour le profil' },
        { method: 'GET', path: '/api/auth/verify-token', description: 'Vérifier un token JWT' },
        // Admin
        { method: 'POST', path: '/api/admin/generate-code', description: 'Générer un code admin (admin only)' },
        { method: 'POST', path: '/api/admin/validate-code', description: 'Valider un code admin' },
        { method: 'POST', path: '/api/admin/request', description: 'Soumettre une demande admin' },
        { method: 'POST', path: '/api/admin/toggle-geo-validation', description: 'Activer/désactiver validation géo' },
        { method: 'POST', path: '/api/admin/cleanup', description: 'Nettoyer la base de données' },
        { method: 'GET', path: '/api/admin/stats', description: 'Statistiques du système' },
        // Posts
        { method: 'POST', path: '/api/posts', description: 'Créer un post (admin only)' },
        { method: 'GET', path: '/api/posts/national', description: 'Récupérer posts nationaux' },
        { method: 'GET', path: '/api/posts/international', description: 'Récupérer posts internationaux' },
        { method: 'POST', path: '/api/posts/:postId/like', description: 'Liker/unliker un post' },
        // Debug
        { method: 'GET', path: '/api/debug/geo', description: 'Informations de géolocalisation' },
        { method: 'POST', path: '/api/debug/test-validation', description: 'Tester la validation géo' },
        // System
        { method: 'GET', path: '/api/health', description: 'Health check du serveur' },
        { method: 'GET', path: '/api/routes', description: 'Liste toutes les routes' }
    ];
    res.json({
        success: true,
        count: routes.length,
        routes: routes,
        baseUrl: 'https://belafrica-backend.onrender.com'
    });
});
// ✅ 404 HANDLER
app.use('*', (req, res) => {
    console.log(`❌ Route non trouvée: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'Route non trouvée',
        path: req.originalUrl,
        method: req.method,
        suggestion: 'Consultez /api/routes pour la liste des routes disponibles'
    });
});
// ✅ ERROR HANDLER GLOBAL
app.use((err, req, res, next) => {
    console.error('🔥 ERREUR SERVEUR:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: getClientIP(req)
    });
    // Erreur JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Token invalide'
        });
    }
    // Erreur d'expiration JWT
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expiré'
        });
    }
    // Erreur Supabase
    if (err.code?.startsWith('PGRST')) {
        return res.status(400).json({
            success: false,
            error: 'Erreur base de données',
            code: err.code
        });
    }
    // Erreur générique
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Erreur interne du serveur',
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err
        })
    });
});
// ✅ DÉMARRER LE SERVEUR
const server = app.listen(PORT, () => {
    console.log(`🚀 SERVEUR BELAFRICA DÉMARRÉ`);
    console.log(`========================================`);
    console.log(`🌍 Port: ${PORT}`);
    console.log(`🔗 URL: https://belafrica-backend.onrender.com`);
    console.log(`📡 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Géolocalisation: ${GEO_VALIDATION_ENABLED ? '✅ Activée' : '⚠️ Désactivée'}`);
    console.log(`🔐 JWT: ${JWT_SECRET !== 'belafrica_default_secret_2025_change_this' ? '✅ Configuré' : '⚠️ Default'}`);
    console.log(`🗄️ Supabase: ${supabaseUrl ? '✅ Connecté' : '❌ Erreur'}`);
    console.log(`========================================`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   🔐 POST /api/auth/request-otp`);
    console.log(`   🔍 GET  /api/debug/geo`);
    console.log(`   ❤️ GET  /api/health`);
    console.log(`   📋 GET  /api/routes`);
    console.log(`========================================`);
});
// ✅ GESTION PROPRE DE L'ARRÊT
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM reçu, arrêt gracieux...');
    server.close(() => {
        console.log('👋 Serveur arrêté');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('🛑 SIGINT reçu, arrêt gracieux...');
    server.close(() => {
        console.log('👋 Serveur arrêté');
        process.exit(0);
    });
});
// ✅ GESTION DES ERREURS NON CAPTURÉES
process.on('uncaughtException', (error) => {
    console.error('💥 ERREUR NON CAPTURÉE:', error);
    // Ne pas arrêter le serveur en prod
    if (process.env.NODE_ENV === 'production') {
        // Logger l'erreur et continuer
        console.error('Continuer malgré l\'erreur non capturée');
    }
    else {
        process.exit(1);
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 PROMESSE NON GÉRÉE:', reason);
    // Logger seulement, ne pas arrêter
});
//# sourceMappingURL=server.js.map