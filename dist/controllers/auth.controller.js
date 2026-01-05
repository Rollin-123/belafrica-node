"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeProfile = exports.verifyOtp = exports.requestOtp = void 0;
const supabase_1 = require("../utils/supabase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const auth_service_1 = require("../services/auth.service");
// Fonction pour générer un code OTP simple
const generateOtpCode = (length = 6) => {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++)
        code += digits[Math.floor(Math.random() * 10)];
    return code;
};
const authService = new auth_service_1.AuthService();
// Map des indicatifs téléphoniques vers les codes pays ISO 3166-1 alpha-2
const phonePrefixToCountryISO = {
    '+49': 'DE', // Allemagne
    '+32': 'BE', // Belgique
    '+375': 'BY', // Biélorussie
    '+1': 'CA', // Canada (et US)
    '+34': 'ES', // Espagne
    '+33': 'FR', // France
    '+39': 'IT', // Italie
    '+41': 'CH', // Suisse
    '+44': 'GB', // Royaume-Uni
    '+7': 'RU' // Russie
};
/**
 * Demande un code OTP (One-Time Password) via Supabase Auth.
 * La géolocalisation est vérifiée ici.
 */
exports.requestOtp = (0, express_async_handler_1.default)(async (req, res) => {
    const { phoneNumber, countryCode } = req.body;
    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;
    if (!phoneNumber || !countryCode) {
        res.status(400);
        throw new Error('Le numéro de téléphone et le code pays sont requis.');
    }
    // =================================================
    // ✅ NOUVELLE LOGIQUE DE GÉO-VALIDATION
    // =================================================
    // Cette vérification est active sauf si GEO_BYPASS_IN_DEV est 'true'
    if (process.env.GEO_BYPASS_IN_DEV !== 'true') {
        // 1. Détecter le pays depuis l'IP (Render fournit cet en-tête)
        const detectedCountryISO = req.headers['x-vercel-ip-country']; // ex: 'FR', 'BY'
        // 2. Déterminer le pays depuis l'indicatif téléphonique
        const phoneCountryISO = phonePrefixToCountryISO[countryCode];
        // 3. Comparer les deux. Si l'IP est détectée mais ne correspond pas au pays du numéro.
        if (detectedCountryISO && phoneCountryISO && detectedCountryISO !== phoneCountryISO) {
            console.warn(`⚠️ Tentative de connexion bloquée : IP de ${detectedCountryISO}, mais numéro de ${phoneCountryISO}.`);
            res.status(403); // 403 Forbidden est le code HTTP approprié
            throw new Error(`Votre localisation détectée (${detectedCountryISO}) ne correspond pas au pays de votre numéro de téléphone (${phoneCountryISO}). ` +
                `Pour des raisons de sécurité, veuillez utiliser un numéro de téléphone du pays où vous vous trouvez actuellement.`);
        }
    }
    // 1. Générer le code et le token
    const otpCode = generateOtpCode();
    // 2. Sauvegarder l'OTP et le token via le service
    const { token } = await authService.saveOTPWithToken(fullPhoneNumber, otpCode);
    if (!token) {
        // Ce cas ne devrait pas être atteint car le service lève une exception en cas d'échec.
        throw new Error("Impossible de générer un token de vérification.");
    }
    // 3. Créer les liens de deep linking
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Belafrica_bot';
    const telegramLink = `https://t.me/${botUsername}?start=${token}`;
    const mobileLink = `tg://resolve?domain=${botUsername}&start=${token}`;
    // 4. Retourner une réponse riche pour le frontend
    res.status(200).json({
        success: true,
        message: 'OTP généré. Cliquez sur le lien pour recevoir votre code.',
        requiresBotStart: true, // Signal pour le frontend
        token: token,
        links: {
            web: telegramLink,
            app: mobileLink,
            universal: telegramLink,
        },
    });
});
/**
 * Vérifie un code OTP et retourne une session (token JWT).
 */
exports.verifyOtp = (0, express_async_handler_1.default)(async (req, res) => {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
        res.status(400);
        throw new Error('Numéro de téléphone et code OTP requis.');
    }
    // 1. Vérifier l'OTP via le service
    const otpData = await authService.verifyOTP(phoneNumber, code);
    if (!otpData) {
        res.status(401);
        throw new Error('Code OTP invalide ou expiré.');
    }
    // 3. Check if user already exists and is verified
    const { data: existingUser } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();
    if (existingUser && existingUser.is_verified) {
        // This user is already fully registered. Log them in.
        const token = jsonwebtoken_1.default.sign({ userId: existingUser.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        res.json({
            success: true,
            message: 'Connexion réussie.',
            token,
            user: existingUser,
        });
        return;
    }
    // 4. User is new or has an incomplete profile. Generate a temporary token with the phone number.
    const tempToken = jsonwebtoken_1.default.sign({ phoneNumber: phoneNumber, temp: true }, // Payload contains phoneNumber
    process.env.TEMP_JWT_SECRET, { expiresIn: '15m' });
    res.json({
        success: true,
        message: 'Code vérifié avec succès.',
        tempToken,
    });
});
exports.completeProfile = (0, express_async_handler_1.default)(async (req, res) => {
    // 1. Get phoneNumber from the protectTemp middleware
    // @ts-ignore
    const phoneNumber = req.user?.phoneNumber;
    if (!phoneNumber) {
        res.status(401);
        throw new Error('Token invalide ou session expirée.');
    }
    // 2. Get profile data from the request body
    const { countryCode, countryName, nationality, nationalityName, pseudo, email, avatar, community } = req.body;
    // 3. Validate required fields
    if (!pseudo || !countryName || !nationalityName || !community) {
        res.status(400);
        throw new Error('Le pseudo, le pays, la nationalité et la communauté sont requis.');
    }
    // 4. Créer ou mettre à jour l'utilisateur via le service
    const finalUser = await authService.upsertUser({
        phone_number: phoneNumber, // This is the conflict key
        country_code: countryCode,
        country_name: countryName,
        nationality: nationality,
        nationality_name: nationalityName,
        community: community,
        pseudo: pseudo,
        email: email,
        avatar_url: avatar,
        is_verified: true, // Mark the user as fully verified
        updated_at: new Date().toISOString(),
    });
    if (!finalUser) {
        throw new Error("Impossible de créer ou de retrouver l'utilisateur après la mise à jour.");
    }
    // 5. Generate the final, permanent session token
    const finalToken = jsonwebtoken_1.default.sign({ userId: finalUser.id }, // Payload for the permanent token
    process.env.JWT_SECRET, { expiresIn: '30d' });
    // 6. Send the successful response
    res.status(200).json({
        success: true,
        message: 'Profil créé avec succès.',
        user: finalUser,
        token: finalToken
    });
});
//# sourceMappingURL=auth.controller.js.map