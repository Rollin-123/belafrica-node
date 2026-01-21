// src/services/jwt.service.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  pseudo: string;
  community: string;
  isAdmin: boolean;
  permissions?: string[];
  adminLevel?: string;
}

export class JWTService {
  private secret: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'belafrica_default_secret';
  }

  generateToken(payload: JWTPayload): string {
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)  
    };

    return jwt.sign(tokenPayload, this.secret);
  }

  // ✅ VÉRIFIER un token
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('❌ Erreur vérification JWT:', error);
      return null;
    }
  }

  // ✅ DÉCODER un token sans vérification
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('❌ Erreur décodage JWT:', error);
      return null;
    }
  }

  // ✅ RENOUVELER un token
  refreshToken(oldToken: string): string | null {
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
    } catch (error) {
      console.error('❌ Erreur renouvellement JWT:', error);
      return null;
    }
  }
}

let jwtInstance: JWTService;

export function getJWTService(): JWTService {
  if (!jwtInstance) {
    jwtInstance = new JWTService();
  }
  
  return jwtInstance;
}

export default JWTService;