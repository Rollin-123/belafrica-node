"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
class AuthController {
    constructor() {
        this.authService = new auth_service_1.AuthService();
    }
    async requestOTP(req, res) {
        try {
            const { phoneNumber, countryCode } = req.body;
            console.log('📱 Demande OTP reçue:', { phoneNumber, countryCode });
            if (!phoneNumber || !countryCode) {
                return res.status(400).json({
                    success: false,
                    error: 'Numéro de téléphone et code pays requis'
                });
            }
            const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
            // Vérifier si l'utilisateur existe déjà
            const existingUser = await this.authService.findUserByPhone(fullPhoneNumber);
            if (existingUser) {
                return res.json({
                    success: true,
                    message: 'Utilisateur existant',
                    userExists: true,
                    requiresOTP: true,
                    phoneNumber: fullPhoneNumber
                });
            }
            // Générer OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            // Sauvegarder OTP
            await this.authService.saveOTP(fullPhoneNumber, otpCode);
            console.log(`🔑 OTP généré: ${otpCode} pour ${fullPhoneNumber}`);
            res.json({
                success: true,
                message: 'OTP envoyé',
                code: otpCode,
                phoneNumber: fullPhoneNumber,
                expiresIn: '10 minutes',
                detectedCountry: 'Biélorussie'
            });
        }
        catch (error) {
            console.error('❌ Erreur requestOTP:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
    async verifyOTP(req, res) {
        try {
            const { phoneNumber, code } = req.body;
            console.log('🔐 Vérification OTP:', { phoneNumber, code });
            if (!phoneNumber || !code) {
                return res.status(400).json({
                    success: false,
                    error: 'Numéro et code requis'
                });
            }
            // Vérifier OTP
            const isValid = await this.authService.verifyOTP(phoneNumber, code);
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Code OTP invalide ou expiré'
                });
            }
            // Vérifier si l'utilisateur existe
            const user = await this.authService.findUserByPhone(phoneNumber);
            if (user) {
                return res.json({
                    success: true,
                    verified: true,
                    user: {
                        id: user.id,
                        pseudo: user.pseudo,
                        community: user.community,
                        isAdmin: user.is_admin,
                        avatar: user.avatar_url
                    },
                    isNewUser: false,
                    message: 'Connexion réussie'
                });
            }
            res.json({
                success: true,
                verified: true,
                message: 'OTP vérifié avec succès',
                phoneNumber: phoneNumber,
                isNewUser: true
            });
        }
        catch (error) {
            console.error('❌ Erreur verifyOTP:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
    async completeProfile(req, res) {
        try {
            const profileData = req.body;
            console.log('👤 Création profil:', profileData);
            const requiredFields = ['phoneNumber', 'countryCode', 'nationality', 'nationalityName', 'pseudo', 'email', 'community'];
            for (const field of requiredFields) {
                if (!profileData[field]) {
                    return res.status(400).json({
                        success: false,
                        error: `Champ manquant: ${field}`
                    });
                }
            }
            // Vérifier si l'utilisateur existe déjà
            const existingUser = await this.authService.findUserByPhone(profileData.phoneNumber);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'Un utilisateur avec ce numéro existe déjà'
                });
            }
            // Formater la communauté
            function formatCommunityName(nationalityName, countryName) {
                const cleanNationality = nationalityName
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, '');
                const cleanCountry = countryName
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, '');
                return `${cleanNationality}En${cleanCountry}`;
            }
            const communityName = formatCommunityName(profileData.nationalityName, profileData.countryName);
            const userData = {
                phone_number: profileData.phoneNumber,
                country_code: profileData.countryCode,
                country_name: profileData.countryName,
                nationality: profileData.nationality,
                nationality_name: profileData.nationalityName,
                pseudo: profileData.pseudo,
                email: profileData.email,
                avatar_url: profileData.avatar,
                community: communityName,
                is_admin: false,
                is_verified: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const user = await this.authService.createUser(userData);
            console.log('✅ Utilisateur créé:', user.id);
            // Générer token (simplifié pour l'instant)
            const token = `belafrica_${user.id}_${Date.now()}`;
            res.json({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    pseudo: user.pseudo,
                    community: user.community,
                    isAdmin: user.is_admin,
                    avatar: user.avatar_url,
                    phoneNumber: user.phone_number
                },
                message: 'Profil créé avec succès'
            });
        }
        catch (error) {
            console.error('❌ Erreur completeProfile:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Erreur création profil'
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map