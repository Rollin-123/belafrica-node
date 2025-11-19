import nodemailer from 'nodemailer';

export interface SMSConfig {
  email: string;
  password: string;
}

export interface SMSResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

class SMSService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Mapper les opérateurs vers leurs gateways email
  private getCarrierGateways(): { [key: string]: string } {
    return {
      'verizon': 'vtext.com',
      'tmobile': 'tmomail.net',
      'att': 'txt.att.net',
      'sprint': 'messaging.sprintpcs.com',
      'virgin': 'vmobl.com',
      'boost': 'myboostmobile.com',
      'cricket': 'mms.cricketwireless.net',
      'metro': 'mymetropcs.com',
      'uscellular': 'email.uscc.net'
    };
  }

  // Détecter l'opérateur à partir du numéro
  private detectCarrier(phoneNumber: string): string {
    // Logique simplifiée de détection d'opérateur
    // En production, utiliser une API comme Twilio Lookup
    const prefixes: { [key: string]: string[] } = {
      'verizon': ['201', '202', '203'],
      'tmobile': ['205', '206', '207'],
      'att': ['210', '212', '214']
    };

    const areaCode = phoneNumber.substring(2, 5);
    
    for (const [carrier, codes] of Object.entries(prefixes)) {
      if (codes.includes(areaCode)) {
        return carrier;
      }
    }

    return 'tmobile'; // Fallback
  }

  // Convertir le numéro en email de gateway
  private phoneToEmail(phoneNumber: string): string {
    const carrier = this.detectCarrier(phoneNumber);
    const gateways = this.getCarrierGateways();
    const gateway = gateways[carrier] || 'tmomail.net'; // Fallback T-Mobile
    
    // Nettoyer le numéro (supprimer le + et espaces)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Format US: 1234567890@gateway
    return `${cleanNumber}@${gateway}`;
  }

  // Générer un OTP sécurisé
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Envoyer un SMS via Email Gateway
  async sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    try {
      const email = this.phoneToEmail(phoneNumber);
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'BELAFRICA Verification',
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #F2A900, #008751); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">BELAFRICA</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">${message}</p>
              <p style="font-size: 12px; color: #666; margin-top: 20px;">
                Si vous n'avez pas demandé ce code, ignorez ce message.
              </p>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`📱 SMS envoyé à ${phoneNumber} via email: ${email}`);
      
      return {
        success: true,
        message: 'SMS envoyé avec succès',
        messageId: result.messageId
      };

    } catch (error: any) {
      console.error('❌ Erreur envoi SMS:', error);
      
      return {
        success: false,
        message: 'Échec envoi SMS',
        error: error.message
      };
    }
  }

  // Envoyer un OTP
  async sendOTP(phoneNumber: string, otpCode: string): Promise<SMSResult> {
    const message = `Votre code de vérification BELAFRICA: ${otpCode}\nCe code expire dans 10 minutes.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  // Vérifier la validité d'un numéro (simplifié)
  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    // Format international: +33612345678
    const phoneRegex = /^\+\d{10,15}$/;
    
    if (!phoneRegex.test(phoneNumber)) {
      return false;
    }

    // Vérifier le code pays (seulement pays autorisés)
    const allowedCountryCodes = ['33', '32', '49', '39', '34', '41', '44', '1', '7', '375'];
    const countryCode = phoneNumber.substring(1, 3);
    
    return allowedCountryCodes.includes(countryCode);
  }
}

export const smsService = new SMSService();
export default SMSService;