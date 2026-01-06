/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 12; 
  private saltLength = 16;
  private tagLength = 16;
  private iterations = 100000;

  // ✅ GÉNÉRER une clé
  private async generateKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, this.iterations, this.keyLength, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }

  // ✅ CHIFFRER un message
  async encryptMessage(message: string, conversationId: string): Promise<string> {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const key = await this.generateKey(conversationId, salt);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(message, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = (cipher as any).getAuthTag();
      
      const encryptedData = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
      
      return encryptedData.toString('base64');
    } catch (error) {
      console.error('❌ Erreur chiffrement:', error);
      throw new Error('Erreur lors du chiffrement du message');
    }
  }

  // ✅ DÉCHIFFRER un message
  async decryptMessage(encryptedMessage: string, conversationId: string): Promise<string> {
    try {
      const encryptedData = Buffer.from(encryptedMessage, 'base64');
      
      const salt = encryptedData.slice(0, this.saltLength);
      const iv = encryptedData.slice(this.saltLength, this.saltLength + this.ivLength);
      const tag = encryptedData.slice(
        this.saltLength + this.ivLength, 
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = encryptedData.slice(this.saltLength + this.ivLength + this.tagLength);
      
      const key = await this.generateKey(conversationId, salt);
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      (decipher as any).setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('❌ Erreur déchiffrement:', error);
      throw new Error('Erreur lors du déchiffrement du message');
    }
  }

  // ✅ HASHER un mot de passe
  async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      
      crypto.pbkdf2(password, salt, this.iterations, 64, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  // ✅ VÉRIFIER un mot de passe
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      
      crypto.pbkdf2(password, salt, this.iterations, 64, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(key === derivedKey.toString('hex'));
      });
    });
  }
}

// Singleton
let encryptionInstance: EncryptionService;

export function getEncryptionService(): EncryptionService {
  if (!encryptionInstance) {
    encryptionInstance = new EncryptionService();
  }
  
  return encryptionInstance;
}

export default EncryptionService;