"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
exports.getJWTService = getJWTService;
// src/services/jwt.service.ts
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JWTService {
    constructor() {
        this.secret = process.env.JWT_SECRET || 'belafrica_default_secret';
    }
    generateToken(payload) {
        const tokenPayload = {
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
        };
        return jsonwebtoken_1.default.sign(tokenPayload, this.secret);
    }
    // ✅ VÉRIFIER un token
    verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.secret);
            return decoded;
        }
        catch (error) {
            console.error('❌ Erreur vérification JWT:', error);
            return null;
        }
    }
    // ✅ DÉCODER un token sans vérification
    decodeToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            return decoded;
        }
        catch (error) {
            console.error('❌ Erreur décodage JWT:', error);
            return null;
        }
    }
    // ✅ RENOUVELER un token
    refreshToken(oldToken) {
        try {
            const decoded = this.verifyToken(oldToken);
            if (!decoded) {
                return null;
            }
            return this.generateToken({
                userId: decoded.userId,
                pseudo: decoded.pseudo,
                community: decoded.community,
                isAdmin: decoded.isAdmin,
                permissions: decoded.permissions,
                adminLevel: decoded.adminLevel
            });
        }
        catch (error) {
            console.error('❌ Erreur renouvellement JWT:', error);
            return null;
        }
    }
}
exports.JWTService = JWTService;
let jwtInstance;
function getJWTService() {
    if (!jwtInstance) {
        jwtInstance = new JWTService();
    }
    return jwtInstance;
}
exports.default = JWTService;
//# sourceMappingURL=jwt.service.js.map