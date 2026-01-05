export declare class AuthService {
    findUserByPhone(phoneNumber: string): Promise<any>;
    /**
     * Sauvegarde un OTP avec un token de deep linking unique.
     * @param phoneNumber Le numéro de téléphone complet.
     * @param code Le code OTP généré.
     * @returns Un objet contenant le token et l'ID de l'OTP.
     */
    saveOTPWithToken(phoneNumber: string, code: string): Promise<{
        token: string;
        otpId: string;
    }>;
    /**
     * Récupère un OTP non vérifié et non expiré par son token.
     * Utilisé par le bot Telegram quand un utilisateur clique sur le lien.
     */
    getOTPByToken(token: string): Promise<any>;
    /**
     * Marque un OTP comme ayant été envoyé par le bot.
     * Empêche le renvoi multiple du code avec le même lien.
     */
    markOTPSent(token: string): Promise<boolean>;
    /**
     * Vérifie un OTP et le marque comme utilisé.
     * @returns Les données de l'OTP si valide, sinon null.
     */
    verifyOTP(phoneNumber: string, code: string): Promise<any | null>;
    /**
     * Crée ou met à jour un utilisateur dans la base de données.
     */
    upsertUser(userData: any): Promise<any>;
}
//# sourceMappingURL=auth.service.d.ts.map