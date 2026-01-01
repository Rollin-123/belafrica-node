"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeProfile = exports.verifyOtp = exports.requestOtp = void 0;
const supabase_1 = require("../utils/supabase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const telegram_service_1 = require("../services/telegram.service");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
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
    // 1. Chercher le chat_id correspondant au numéro de téléphone
    const { data: chatData, error: chatError } = await supabase_1.supabase
        .from('telegram_chats')
        .select('chat_id')
        .eq('phone_number', fullPhoneNumber)
        .single();
    if (chatError || !chatData) {
        res.status(404);
        throw new Error("Ce numéro n'est pas encore enregistré.\n\nVeuillez d'abord interagir avec notre bot sur Telegram pour lier votre compte.\n\nLien du bot : https://t.me/Belafrica_bot");
    }
    // 2. Générer le code et le sauvegarder dans la table 'otps'
    const otpCode = generateOtpCode();
    const { error: otpError } = await supabase_1.supabase.from('otps').insert({
        phone_number: fullPhoneNumber,
        code: otpCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000) // Expire dans 10 minutes
    });
    if (otpError) {
        console.error("Erreur de sauvegarde OTP:", otpError);
        throw new Error("Impossible de sauvegarder le code de vérification.");
    }
    // 3. Envoyer le code via Telegram
    await (0, telegram_service_1.sendTelegramMessage)(chatData.chat_id, `Votre code de vérification pour BELAFRICA est : ${otpCode}`);
    res.status(200).json({ success: true, message: "Un code de vérification a été envoyé sur votre compte Telegram." });
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
    // 1. Vérifier le code OTP dans la table 'otps'
    const { data: otpData, error: otpError } = await supabase_1.supabase
        .from('otps')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('code', code)
        .single();
    if (otpError || !otpData) {
        res.status(401);
        throw new Error('Code OTP invalide.');
    }
    if (new Date(otpData.expires_at) < new Date()) {
        res.status(401);
        throw new Error('Code OTP expiré.');
    }
    // 2. Supprimer le code OTP pour qu'il ne puisse pas être réutilisé
    await supabase_1.supabase.from('otps').delete().eq('id', otpData.id);
    // 3. Vérifier si l'utilisateur existe déjà et est vérifié
    const { data: existingUser } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();
    if (existingUser && existingUser.is_verified) { // L'utilisateur est déjà entièrement enregistré. Le connecter.
        const token = jsonwebtoken_1.default.sign({ userId: existingUser.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        res.json({
            success: true,
            message: 'Connexion réussie.',
            token,
            user: existingUser,
        });
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