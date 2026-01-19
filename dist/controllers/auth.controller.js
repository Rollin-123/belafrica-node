"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeProfile = exports.verifyOtp = exports.requestOtp = void 0;
const supabase_1 = require("../utils/supabase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const uuid_1 = require("uuid");
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
    '+49': 'DE',
    '+32': 'BE',
    '+375': 'BY',
    '+1': 'CA',
    '+34': 'ES',
    '+33': 'FR',
    '+39': 'IT',
    '+41': 'CH',
    '+44': 'GB',
    '+7': 'RU'
};
exports.requestOtp = (0, express_async_handler_1.default)(async (req, res) => {
    const { phoneNumber, countryCode } = req.body;
    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;
    if (!phoneNumber || !countryCode) {
        res.status(400);
        throw new Error('Le numéro de téléphone et le code pays sont requis.');
    }
    if (process.env.GEO_BYPASS_IN_DEV !== 'true') {
        const detectedCountryISO = req.headers['x-vercel-ip-country'];
        const phoneCountryISO = phonePrefixToCountryISO[countryCode];
        if (detectedCountryISO && phoneCountryISO && detectedCountryISO !== phoneCountryISO) {
            console.warn(`⚠️ Tentative de connexion bloquée : IP de ${detectedCountryISO}, mais numéro de ${phoneCountryISO}.`);
            res.status(403);
            throw new Error(`Votre localisation détectée (${detectedCountryISO}) ne correspond pas au pays de votre numéro de téléphone (${phoneCountryISO}). ` +
                `Pour des raisons de sécurité, veuillez utiliser un numéro de téléphone du pays où vous vous trouvez actuellement.`);
        }
    }
    const { data: existingUser } = await supabase_1.supabase
        .from('users')
        .select('id, is_verified')
        .eq('phone_number', fullPhoneNumber)
        .single();
    const userExists = !!(existingUser && existingUser.is_verified);
    const otpCode = generateOtpCode();
    const { token } = await authService.saveOTPWithToken(fullPhoneNumber, otpCode);
    if (!token) {
        throw new Error("Impossible de générer un token de vérification.");
    }
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Belafrica_bot';
    const telegramLink = `https://t.me/${botUsername}?start=${token}`;
    const mobileLink = `tg://resolve?domain=${botUsername}&start=${token}`;
    res.status(200).json({
        success: true,
        message: userExists
            ? 'Utilisateur reconnu. Veuillez vérifier votre identité pour vous connecter.'
            : 'OTP généré. Cliquez sur le lien pour recevoir votre code.',
        requiresBotStart: true,
        userExists: userExists,
        token: token,
        links: {
            web: telegramLink,
            app: mobileLink,
            universal: telegramLink,
        },
    });
});
exports.verifyOtp = (0, express_async_handler_1.default)(async (req, res) => {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
        res.status(400);
        throw new Error('Numéro de téléphone et code OTP requis.');
    }
    const otpData = await authService.verifyOTP(phoneNumber, code);
    if (!otpData) {
        res.status(401);
        throw new Error('Code OTP invalide ou expiré.');
    }
    const { data: existingUser } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();
    if (existingUser && existingUser.is_verified) {
        const token = jsonwebtoken_1.default.sign({ userId: existingUser.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(200).json({
            success: true,
            message: 'Connexion réussie.',
            user: existingUser,
        });
        return;
    }
    const tempToken = jsonwebtoken_1.default.sign({ phoneNumber: phoneNumber, temp: true }, process.env.TEMP_JWT_SECRET || process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({
        success: true,
        message: 'Code vérifié avec succès.',
        tempToken,
    });
});
exports.completeProfile = (0, express_async_handler_1.default)(async (req, res) => {
    // @ts-ignore
    const phoneNumber = req.user?.phoneNumber;
    if (!phoneNumber) {
        res.status(401);
        throw new Error('Token invalide ou session expirée.');
    }
    const { countryCode, countryName, nationality, nationalityName, pseudo, email, avatar, community } = req.body;
    if (!pseudo || !countryName || !nationalityName || !community) {
        res.status(400);
        throw new Error('Le pseudo, le pays, la nationalité et la communauté sont requis.');
    }
    const finalUser = await authService.upsertUser({
        id: (0, uuid_1.v4)(),
        phone_number: phoneNumber,
        country_code: countryCode,
        country_name: countryName,
        nationality: nationality,
        nationality_name: nationalityName,
        community: community,
        pseudo: pseudo,
        email: email,
        avatar_url: avatar,
        is_verified: true,
        updated_at: new Date().toISOString(),
    });
    if (!finalUser) {
        throw new Error("Impossible de créer ou de retrouver l'utilisateur après la mise à jour.");
    }
    const finalToken = jsonwebtoken_1.default.sign({ userId: finalUser.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.cookie('access_token', finalToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.status(200).json({
        success: true,
        message: 'Profil créé avec succès.',
        user: finalUser,
    });
});
//# sourceMappingURL=auth.controller.js.map