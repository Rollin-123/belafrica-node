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
// Fonction pour générer un code OTP simple
const generateOtpCode = (length = 6) => {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++)
        code += digits[Math.floor(Math.random() * 10)];
    return code;
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
    // 1. Générer le code et le token
    const otpCode = generateOtpCode();
    const token = (0, uuid_1.v4)(); // Token unique pour le deep link
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expire dans 10 minutes
    // 2. Sauvegarder l'OTP et le token dans la table 'otp_codes' (et non 'otps')
    const { data: otpData, error: otpError } = await supabase_1.supabase
        .from('otp_codes')
        .insert({
        phone_number: fullPhoneNumber,
        code: otpCode,
        token: token,
        expires_at: expiresAt.toISOString(),
        bot_sent: false, // Initialement, le bot n'a pas envoyé le code
    })
        .select()
        .single();
    if (otpError || !otpData) {
        console.error("Erreur de sauvegarde OTP avec token:", otpError);
        throw new Error("Impossible de sauvegarder le code de vérification.");
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
    // 1. Vérifier l'OTP dans la table 'otp_codes' en s'assurant qu'il est valide, non expiré et non vérifié.
    const { data: otpData, error: otpError } = await supabase_1.supabase
        .from('otp_codes')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('code', code)
        .eq('verified', false) // ✅ SÉCURITÉ : S'assurer que le code n'a pas déjà été utilisé
        .gt('expires_at', new Date().toISOString()) // ✅ SÉCURITÉ : S'assurer que le code n'est pas expiré
        .single();
    if (otpError || !otpData) {
        res.status(401);
        // PGRST116 est l'erreur pour "aucune ligne trouvée", ce qui est le cas attendu pour un code invalide/expiré.
        if (otpError && otpError.code !== 'PGRST116')
            console.error('Erreur de vérification OTP Supabase:', otpError);
        throw new Error('Code OTP invalide ou expiré.');
    }
    // 2. Marquer l'OTP comme vérifié pour qu'il ne puisse plus être utilisé
    await supabase_1.supabase.from('otp_codes').update({ verified: true }).eq('id', otpData.id);
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
    // 4. Find or update the user in the database using `upsert`
    const { data: finalUser, error: upsertError } = await supabase_1.supabase
        .from('users')
        .upsert({
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
    })
        .eq('phone_number', phoneNumber) // Ensure we update the correct user
        .select()
        .single();
    if (upsertError) {
        console.error("Erreur lors de la finalisation du profil (upsert):", upsertError);
        res.status(500);
        throw new Error('Erreur serveur lors de la finalisation du profil.');
    }
    if (!finalUser) {
        res.status(404);
        throw new Error("Impossible de retrouver l'utilisateur après la mise à jour.");
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