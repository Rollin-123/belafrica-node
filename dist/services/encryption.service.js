"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
exports.getEncryptionService = getEncryptionService;
const crypto_1 = __importDefault(require("crypto"));
class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 12;
        this.saltLength = 16;
        this.tagLength = 16;
        this.iterations = 100000;
    }
    // ✅ GÉNÉRER une clé
    async generateKey(password, salt) {
        return new Promise((resolve, reject) => {
            crypto_1.default.pbkdf2(password, salt, this.iterations, this.keyLength, 'sha256', (err, key) => {
                if (err)
                    reject(err);
                else
                    resolve(key);
            });
        });
    }
    // ✅ CHIFFRER un message
    async encryptMessage(message, conversationId) {
        try {
            const salt = crypto_1.default.randomBytes(this.saltLength);
            const key = await this.generateKey(conversationId, salt);
            const iv = crypto_1.default.randomBytes(this.ivLength);
            const cipher = crypto_1.default.createCipheriv(this.algorithm, key, iv);
            let encrypted = cipher.update(message, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();
            const encryptedData = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
            return encryptedData.toString('base64');
        }
        catch (error) {
            console.error('❌ Erreur chiffrement:', error);
            throw new Error('Erreur lors du chiffrement du message');
        }
    }
    // ✅ DÉCHIFFRER un message
    async decryptMessage(encryptedMessage, conversationId) {
        try {
            const encryptedData = Buffer.from(encryptedMessage, 'base64');
            const salt = encryptedData.slice(0, this.saltLength);
            const iv = encryptedData.slice(this.saltLength, this.saltLength + this.ivLength);
            const tag = encryptedData.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
            const encrypted = encryptedData.slice(this.saltLength + this.ivLength + this.tagLength);
            const key = await this.generateKey(conversationId, salt);
            const decipher = crypto_1.default.createDecipheriv(this.algorithm, key, iv);
            decipher.setAuthTag(tag);
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString('utf8');
        }
        catch (error) {
            console.error('❌ Erreur déchiffrement:', error);
            throw new Error('Erreur lors du déchiffrement du message');
        }
    }
    // ✅ HASHER un mot de passe
    async hashPassword(password) {
        return new Promise((resolve, reject) => {
            const salt = crypto_1.default.randomBytes(16).toString('hex');
            crypto_1.default.pbkdf2(password, salt, this.iterations, 64, 'sha256', (err, derivedKey) => {
                if (err)
                    reject(err);
                else
                    resolve(`${salt}:${derivedKey.toString('hex')}`);
            });
        });
    }
    // ✅ VÉRIFIER un mot de passe
    async verifyPassword(password, hash) {
        return new Promise((resolve, reject) => {
            const [salt, key] = hash.split(':');
            crypto_1.default.pbkdf2(password, salt, this.iterations, 64, 'sha256', (err, derivedKey) => {
                if (err)
                    reject(err);
                else
                    resolve(key === derivedKey.toString('hex'));
            });
        });
    }
}
exports.EncryptionService = EncryptionService;
// Singleton
let encryptionInstance;
function getEncryptionService() {
    if (!encryptionInstance) {
        encryptionInstance = new EncryptionService();
    }
    return encryptionInstance;
}
exports.default = EncryptionService;
//# sourceMappingURL=encryption.service.js.map