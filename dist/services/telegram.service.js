"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
exports.getTelegramService = getTelegramService;
const axios_1 = __importDefault(require("axios"));
class TelegramService {
    constructor(config) {
        this.botToken = config.botToken;
        this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
        this.creatorChatId = config.chatId || process.env.TELEGRAM_CREATOR_CHAT_ID || '';
        console.log('🤖 Service Telegram initialisé');
        console.log(`📞 Chat ID créateur: ${this.creatorChatId ? 'Configuré' : 'Non configuré'}`);
    }
    async sendOTP(phoneNumber, code) {
        try {
            console.log('🤖 [TELEGRAM] Envoi OTP:', { phoneNumber, code });
            const message = `🔐 Code OTP BELAFRICA\n\n` +
                `Code: ${code}\n` +
                `Numéro: ${phoneNumber}\n` +
                `Expire dans: 10 minutes`;
            console.log('📱 Message Telegram simulé:', message);
            await this.sendMessage(this.creatorChatId, message);
            return {
                success: true,
                message: 'Code OTP généré',
                code: code
            };
        }
        catch (error) {
            console.error('❌ [TELEGRAM] Erreur envoi OTP:', error);
            return {
                success: false,
                error: 'Erreur envoi Telegram'
            };
        }
    }
    async sendMessage(chatId, text, parseMode = 'HTML') {
        try {
            console.log(`📤 Envoi message Telegram à ${chatId}...`);
            const response = await axios_1.default.post(`${this.apiUrl}/sendMessage`, {
                chat_id: chatId,
                text: text,
                parse_mode: parseMode,
                disable_web_page_preview: true
            }, {
                timeout: 10000
            });
            console.log(`✅ Message Telegram envoyé à ${chatId}:`, response.data.result?.message_id);
            return response.data.ok === true;
        }
        catch (error) {
            console.error('❌ Erreur envoi message Telegram:', {
                chatId,
                error: error.response?.data?.description || error.message
            });
            return false;
        }
    }
    async testConnection() {
        try {
            console.log('🔗 Test connexion Telegram...');
            const response = await axios_1.default.get(`${this.apiUrl}/getMe`, {
                timeout: 5000
            });
            if (response.data.ok && response.data.result) {
                console.log(`✅ Bot Telegram connecté: @${response.data.result.username}`);
                if (this.creatorChatId) {
                    await this.sendMessage(this.creatorChatId, '🤖 Bot BELAFRICA connecté et opérationnel !\n\nPrêt à envoyer des codes OTP.');
                }
                return {
                    success: true,
                    username: response.data.result.username
                };
            }
            return {
                success: false,
                error: 'Réponse Telegram invalide'
            };
        }
        catch (error) {
            console.error('❌ Erreur connexion Telegram:', error.message);
            return {
                success: false,
                error: `Erreur API Telegram: ${error.message}`
            };
        }
    }
    async sendAdminNotification(userData, code) {
        try {
            const message = `👑 NOUVELLE DEMANDE ADMINISTRATEUR\n\n` +
                `👤 Utilisateur: ${userData.pseudo}\n` +
                `🏠 Communauté: ${userData.community}\n` +
                `📞 Téléphone: ${userData.phoneNumber}\n` +
                `📧 Email: ${userData.email || 'Non fourni'}\n\n` +
                `🔑 CODE ADMIN: ${code}\n` +
                `⏰ Valable: 72 heures\n\n` +
                `📍 ${new Date().toLocaleString('fr-FR')}`;
            if (this.creatorChatId) {
                return await this.sendMessage(this.creatorChatId, message);
            }
            console.warn('⚠️ TELEGRAM_CREATOR_CHAT_ID non configuré pour notification admin');
            return false;
        }
        catch (error) {
            console.error('❌ Erreur notification admin Telegram:', error);
            return false;
        }
    }
    async setupBotCommands() {
        try {
            const commands = [
                { command: 'start', description: 'Démarrer le bot BELAFRICA' },
                { command: 'help', description: 'Afficher l\'aide' },
                { command: 'status', description: 'Vérifier le statut du bot' },
                { command: 'support', description: 'Contacter le support' }
            ];
            const response = await axios_1.default.post(`${this.apiUrl}/setMyCommands`, {
                commands: commands,
                scope: { type: 'default' },
                language_code: 'fr'
            });
            console.log('✅ Commandes bot configurées');
            return response.data.ok === true;
        }
        catch (error) {
            console.error('❌ Erreur configuration commandes bot:', error);
            return false;
        }
    }
}
exports.TelegramService = TelegramService;
let telegramInstance = null;
function getTelegramService() {
    if (!telegramInstance) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || '8407730360:AAGRTq8xz7zO9ZS-TM7nVZtr409TAZW8nFM';
        const creatorChatId = process.env.TELEGRAM_CREATOR_CHAT_ID || '7486840834';
        console.log(`🤖 Initialisation Telegram avec token: ${botToken.substring(0, 10)}...`);
        console.log(`👑 Chat ID créateur: ${creatorChatId}`);
        telegramInstance = new TelegramService({
            botToken: botToken,
            chatId: creatorChatId
        });
        telegramInstance.testConnection().then(health => {
            if (health.success) {
                console.log(`🎉 Bot Telegram prêt: @${health.username}`);
                telegramInstance.setupBotCommands();
            }
            else {
                console.error('❌ Bot Telegram non connecté:', health.error);
            }
        });
    }
    return telegramInstance;
}
exports.default = TelegramService;
//# sourceMappingURL=telegram.service.js.map