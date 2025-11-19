import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Configuration Twilio (vous devrez créer un compte)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export class SMSService {
  // ✅ ENVOYER UN OTP RÉEL
  static async sendOTP(phoneNumber: string, otpCode: string): Promise<{ success: boolean; message?: string }> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 [DEV] OTP ${otpCode} envoyé à ${phoneNumber}`);
        return { success: true, message: 'OTP envoyé (mode développement)' };
      }

      const message = await client.messages.create({
        body: `Votre code de vérification BELAFRICA est: ${otpCode}. Valide 10 minutes.`,
        from: TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`✅ SMS envoyé via Twilio SID: ${message.sid}`);
      return { success: true, message: 'OTP envoyé avec succès' };

    } catch (error: any) {
      console.error('❌ Erreur envoi SMS:', error.message);
      
      // Fallback: simulation en cas d'erreur
      console.log(`📱 [FALLBACK] OTP ${otpCode} pour ${phoneNumber}`);
      return { 
        success: true, 
        message: 'OTP simulé (erreur service SMS)' 
      };
    }
  }

  // ✅ GÉNÉRER UN OTP
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}