export declare class EncryptionService {
    private algorithm;
    private keyLength;
    private ivLength;
    private saltLength;
    private tagLength;
    private iterations;
    private generateKey;
    encryptMessage(message: string, conversationId: string): Promise<string>;
    decryptMessage(encryptedMessage: string, conversationId: string): Promise<string>;
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, hash: string): Promise<boolean>;
}
export declare function getEncryptionService(): EncryptionService;
export default EncryptionService;
//# sourceMappingURL=encryption.service.d.ts.map