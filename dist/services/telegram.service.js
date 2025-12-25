"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramMessage = exports.initializeTelegramBot = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const supabase_1 = require("../utils/supabase");
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN non défini. Le bot Telegram ne démarrera pas.');
}
const bot = token ? new node_telegram_bot_api_1.default(token, { polling: true }) : null;
const initializeTelegramBot = () => {
    if (!bot)
        return;
    console.log('🤖 Bot Telegram démarré et à l\'écoute...');
    // Gère la commande /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, "Bienvenue sur le bot de BELAFRICA ! Pour lier votre numéro de téléphone à votre compte, veuillez utiliser le bouton ci-dessous.", {
            reply_markup: {
                keyboard: [[{ text: "🔗 Partager mon contact", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    });
    // Gère le partage de contact
    bot.on('contact', async (msg) => {
        const chatId = msg.chat.id;
        let phone = msg.contact?.phone_number.replace(/\s/g, '');
        if (!phone) {
            bot.sendMessage(chatId, "❌ Impossible de récupérer votre numéro. Veuillez réessayer.");
            return;
        }
        // ✅ S'assurer que le numéro commence toujours par un '+'
        if (!phone.startsWith('+')) {
            phone = `+${phone}`;
        }
        try {
            // Enregistre ou met à jour le lien dans la base de données
            const { error } = await supabase_1.supabase
                .from('telegram_chats')
                .upsert({ chat_id: chatId, phone_number: phone }, { onConflict: 'phone_number' });
            if (error)
                throw error;
            bot.sendMessage(chatId, `✅ Votre numéro ${phone} a bien été enregistré ! Vous pouvez maintenant recevoir des codes de vérification.`);
        }
        catch (error) {
            console.error("Erreur lors de l'enregistrement du contact Telegram:", error);
            bot.sendMessage(chatId, "❌ Une erreur est survenue lors de l'enregistrement. Veuillez contacter le support.");
        }
    });
};
exports.initializeTelegramBot = initializeTelegramBot;
// Fonction pour envoyer un message à un chat_id spécifique
const sendTelegramMessage = (chatId, message) => {
    if (!bot)
        return Promise.reject('Bot Telegram non initialisé.');
    return bot.sendMessage(chatId, message);
};
exports.sendTelegramMessage = sendTelegramMessage;
//# sourceMappingURL=telegram.service.js.map