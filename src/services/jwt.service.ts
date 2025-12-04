// src/services/jwt.service.ts
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
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

  // ✅ GÉNÉRER un token
  generateToken(payload: JWTPayload): string {
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 jours
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

// Singleton
let jwtInstance: JWTService;

export function getJWTService(): JWTService {
  if (!jwtInstance) {
    jwtInstance = new JWTService();
  }
  
  return jwtInstance;
}

export default JWTService;
