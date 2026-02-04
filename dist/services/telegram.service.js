"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = exports.sendTelegramMessage = exports.initializeTelegramBot = void 0;
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const supabase_1 = require("../utils/supabase");
const auth_service_1 = require("./auth.service");
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN non défini. Le bot Telegram ne démarrera pas.');
}
const bot = token ? new node_telegram_bot_api_1.default(token) : null;
exports.bot = bot;
const authService = new auth_service_1.AuthService();
const initializeTelegramBot = (app) => {
    if (!bot || !token) {
        console.warn('⚠️ Bot Telegram non initialisé (token manquant)');
        return;
    }
    // Utiliser un webhook en production, polling en développement
    if (process.env.NODE_ENV === 'production') {
        console.log('✅ Mode Production détecté. Configuration du Webhook Telegram...');
        const webhookUrl = `${process.env.BACKEND_URL}/api/telegram-webhook/${token}`;
        bot.setWebHook(webhookUrl)
            .then(() => console.log(`✅ Webhook Telegram configuré sur: ${webhookUrl}`))
            .catch(err => console.error('❌ Erreur configuration webhook:', err));
    }
    else {
        console.log('⚠️ Mode Développement détecté. Démarrage du Polling Telegram...');
        bot.startPolling();
    }
    console.log('🤖 Bot Telegram démarré avec la logique de deep linking...');
    // ✅ GESTION DU DEEP LINKING : /start [token]
    bot.onText(/\/start (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const token = match[1];
        console.log(`📲 Deep link reçu: /start ${token} de ${chatId}`);
        try {
            // 1. Chercher l'OTP associé au token via notre service
            const otpData = await authService.getOTPByToken(token);
            if (!otpData) {
                await bot.sendMessage(chatId, '❌ Ce lien a expiré ou est invalide.\n\nVeuillez retourner sur BELAFRICA et redemander un code.');
                return;
            }
            // 2. Envoyer le code à l'utilisateur avec un message clair
            await bot.sendMessage(chatId, `✅ **CODE DE VÉRIFICATION BELAFRICA**\n\n` +
                `Votre code : \`${otpData.code}\`\n\n` +
                `⚠️ *Important :*\n` +
                `• Ce code expire dans 10 minutes\n` +
                `• Ne le partagez avec personne\n` +
                `• Retournez sur l'application pour continuer`, { parse_mode: 'Markdown' });
            // 3. Marquer l'OTP comme envoyé pour éviter sa réutilisation
            await authService.markOTPSent(token);
            console.log(`✅ Code ${otpData.code} envoyé à ${otpData.phone_number} via deep link`);
            // 4. Enregistrer le chat_id pour les futures communications (notifications, etc.)
            try {
                await supabase_1.supabase
                    .from('telegram_chats')
                    .upsert({
                    chat_id: chatId,
                    phone_number: otpData.phone_number,
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'phone_number'
                });
            }
            catch (dbError) {
                console.warn('⚠️ Erreur enregistrement chat_id (non critique):', dbError);
            }
        }
        catch (error) {
            console.error('❌ Erreur traitement deep link:', error);
            await bot.sendMessage(chatId, 'Une erreur est survenue. Veuillez réessayer en redemandant un code dans l\'application.');
        }
    });
    // ✅ GESTION DE /start SANS TOKEN (quand un utilisateur trouve le bot manuellement)
    bot.onText(/\/start$/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, '👋 Bienvenue sur **BELAFRICA** !\n\n' +
            'Ce bot vous envoie les codes de vérification pour l\'application BELAFRICA.\n\n' +
            'Pour recevoir un code, veuillez ouvrir l\'application et entrer votre numéro de téléphone.', { parse_mode: 'Markdown' });
    });
    // ✅ CONSERVER L'ANCIENNE LOGIQUE DE CONTACT (pour la compatibilité)
    bot.on('contact', async (msg) => {
        const chatId = msg.chat.id;
        let phone = msg.contact?.phone_number.replace(/\s/g, '');
        if (!phone) {
            bot.sendMessage(chatId, "❌ Impossible de récupérer votre numéro.");
            return;
        }
        if (!phone.startsWith('+')) {
            phone = `+${phone}`;
        }
        try {
            const { error } = await supabase_1.supabase
                .from('telegram_chats')
                .upsert({ chat_id: chatId, phone_number: phone }, { onConflict: 'phone_number' });
            if (error)
                throw error;
            bot.sendMessage(chatId, `✅ Votre numéro ${phone} a été enregistré !\n\n` +
                `Maintenant, retournez sur BELAFRICA et entrez votre numéro pour recevoir un code.`);
        }
        catch (error) {
            console.error("Erreur enregistrement contact:", error);
            bot.sendMessage(chatId, "❌ Erreur lors de l'enregistrement.");
        }
    });
};
exports.initializeTelegramBot = initializeTelegramBot;
const sendTelegramMessage = (chatId, message) => {
    if (!bot)
        return Promise.reject('Bot Telegram non initialisé.');
    return bot.sendMessage(chatId, message);
};
exports.sendTelegramMessage = sendTelegramMessage;
//# sourceMappingURL=telegram.service.js.map