// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { getJWTService } from '../services/jwt.service';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Token invalide'
      });
    }

    const jwtService = getJWTService();
    const decoded = jwtService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Token invalide ou expiré'
      });
    }

    // Ajouter les informations de l'utilisateur à la requête
    (req as any).user = decoded;

    next();
  } catch (error: any) {
    console.error('🔥 Erreur authMiddleware:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expiré'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalide'
      });
    }

    return res.status(500).json({
      error: 'Erreur d\'authentification'
    });
  }
}
