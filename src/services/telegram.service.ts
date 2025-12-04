import axios from 'axios';

export interface TelegramConfig {
  botToken: string;
  chatId?: string;
}

export interface OTPSendResult {
  success: boolean;
  message?: string;
  code?: string;
  error?: string;
}

export interface OTPVerifyResult {
  success: boolean;
  user?: any;
  error?: string;
}

export class TelegramService {
  private botToken: string;
  private apiUrl: string;
  private creatorChatId: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.creatorChatId = config.chatId || process.env.TELEGRAM_CREATOR_CHAT_ID || '';
    
    console.log('🤖 Service Telegram initialisé');
    console.log(`📞 Chat ID créateur: ${this.creatorChatId ? 'Configuré' : 'Non configuré'}`);
  }

  // ✅ ENVOYER un OTP VIA TELEGRAM (VRAI ENVOI AU CRÉATEUR)
  // async sendOTP(phoneNumber: string): Promise<OTPSendResult> {
  //   try {
  //     // 1. Générer un code OTP sécurisé
  //     const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  //     const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
  //     console.log(`📱 Génération OTP pour ${phoneNumber}: ${otpCode}`);

  //     // 2. ENVOYER VRAIMENT AU CRÉATEUR VIA TELEGRAM
  //     if (this.creatorChatId) {
  //       const message = `🔐 CODE OTP BELAFRICA\n\n` +
  //                      `📞 Numéro: ${phoneNumber}\n` +
  //                      `🔢 Code: ${otpCode}\n` +
  //                      `⏰ Expire: ${expiresAt.toLocaleTimeString('fr-FR')} (dans 10 min)\n` +
  //                      `📅 Date: ${expiresAt.toLocaleDateString('fr-FR')}\n\n` +
  //                      `📍 ${new Date().toLocaleString('fr-FR')}\n\n` +
  //                      `ℹ️ Envoyez ce code à l'utilisateur`;
        
  //       const sent = await this.sendMessage(this.creatorChatId, message);
        
  //       if (sent) {
  //         console.log(`✅ OTP envoyé au créateur Telegram: ${otpCode} pour ${phoneNumber}`);
          
  //         return {
  //           success: true,
  //           message: `Code OTP ${otpCode} généré. Le créateur a été notifié sur Telegram et vous enverra le code.`,
  //           code: otpCode
  //         };
  //       } else {
  //         console.error(`❌ Échec envoi Telegram au créateur pour ${phoneNumber}`);
          
  //         // Fallback: retourner quand même le code
  //         return {
  //           success: true,
  //           message: `Code OTP ${otpCode} généré. Contactez le créateur pour obtenir le code.`,
  //           code: otpCode
  //         };
  //       }
  //     } else {
  //       console.error('❌ TELEGRAM_CREATOR_CHAT_ID non configuré');
        
  //       return {
  //         success: true,
  //         message: `Code OTP ${otpCode} généré. Contactez le support pour obtenir le code.`,
  //         code: otpCode
  //       };
  //     }

  //   } catch (error: any) {
  //     console.error('❌ Erreur envoi OTP Telegram:', error);
      
  //     // Générer quand même un code en cas d'erreur
  //     const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
      
  //     return {
  //       success: true,
  //       message: `Erreur Telegram. Code de secours: ${fallbackCode}`,
  //       code: fallbackCode,
  //       error: `Erreur Telegram: ${error.message}`
  //     };
  //   }
  // }
  async sendOTP(phoneNumber: string, code: string): Promise<OTPSendResult> {
    try {
      console.log('🤖 [TELEGRAM] Envoi OTP:', { phoneNumber, code });
      
      // Simuler l'envoi (en production, envoi réel au bot)
      const message = `🔐 Code OTP BELAFRICA\n\n` +
                     `Code: ${code}\n` +
                     `Numéro: ${phoneNumber}\n` +
                     `Expire dans: 10 minutes`;
      
      // Log pour le développeur
      console.log('📱 Message Telegram simulé:', message);
      
      // En production, décommentez :
      await this.sendMessage(this.creatorChatId, message);
      
      return {
        success: true,
        message: 'Code OTP généré',
        code: code
      };
      
    } catch (error: any) {
      console.error('❌ [TELEGRAM] Erreur envoi OTP:', error);
      return {
        success: false,
        error: 'Erreur envoi Telegram'
      };
    }
  }

  // ✅ ENVOYER un message Telegram (VRAI)
  async sendMessage(chatId: string, text: string, parseMode: string = 'HTML'): Promise<boolean> {
    try {
      console.log(`📤 Envoi message Telegram à ${chatId}...`);
      
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true
      }, {
        timeout: 10000 // 10 secondes timeout
      });
      
      console.log(`✅ Message Telegram envoyé à ${chatId}:`, response.data.result?.message_id);
      return response.data.ok === true;
      
    } catch (error: any) {
      console.error('❌ Erreur envoi message Telegram:', {
        chatId,
        error: error.response?.data?.description || error.message
      });
      return false;
    }
  }

  // ✅ TESTER LA CONNEXION TELEGRAM
  async testConnection(): Promise<{ success: boolean; username?: string; error?: string }> {
    try {
      console.log('🔗 Test connexion Telegram...');
      
      const response = await axios.get(`${this.apiUrl}/getMe`, {
        timeout: 5000
      });
      
      if (response.data.ok && response.data.result) {
        console.log(`✅ Bot Telegram connecté: @${response.data.result.username}`);
        
        // Envoyer un message de test au créateur
        if (this.creatorChatId) {
          await this.sendMessage(
            this.creatorChatId,
            '🤖 Bot BELAFRICA connecté et opérationnel !\n\nPrêt à envoyer des codes OTP.'
          );
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
      
    } catch (error: any) {
      console.error('❌ Erreur connexion Telegram:', error.message);
      return {
        success: false,
        error: `Erreur API Telegram: ${error.message}`
      };
    }
  }

  // ✅ ENVOYER une notification admin
  async sendAdminNotification(userData: any, code: string): Promise<boolean> {
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
      
    } catch (error: any) {
      console.error('❌ Erreur notification admin Telegram:', error);
      return false;
    }
  }

  // ✅ CONFIGURER les commandes du bot
  async setupBotCommands(): Promise<boolean> {
    try {
      const commands = [
        { command: 'start', description: 'Démarrer le bot BELAFRICA' },
        { command: 'help', description: 'Afficher l\'aide' },
        { command: 'status', description: 'Vérifier le statut du bot' },
        { command: 'support', description: 'Contacter le support' }
      ];

      const response = await axios.post(`${this.apiUrl}/setMyCommands`, {
        commands: commands,
        scope: { type: 'default' },
        language_code: 'fr'
      });

      console.log('✅ Commandes bot configurées');
      return response.data.ok === true;
      
    } catch (error: any) {
      console.error('❌ Erreur configuration commandes bot:', error);
      return false;
    }
  }
}

// Singleton amélioré
let telegramInstance: TelegramService | null = null;

export function getTelegramService(): TelegramService {
  if (!telegramInstance) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8407730360:AAGRTq8xz7zO9ZS-TM7nVZtr409TAZW8nFM';
    const creatorChatId = process.env.TELEGRAM_CREATOR_CHAT_ID || '7486840834';
    
    console.log(`🤖 Initialisation Telegram avec token: ${botToken.substring(0, 10)}...`);
    console.log(`👑 Chat ID créateur: ${creatorChatId}`);
    
    telegramInstance = new TelegramService({
      botToken: botToken,
      chatId: creatorChatId
    });
    
    // Tester la connexion au démarrage
    telegramInstance.testConnection().then(health => {
      if (health.success) {
        console.log(`🎉 Bot Telegram prêt: @${health.username}`);
        telegramInstance!.setupBotCommands();
      } else {
        console.error('❌ Bot Telegram non connecté:', health.error);
      }
    });
  }
  
  return telegramInstance;
}

export default TelegramService;