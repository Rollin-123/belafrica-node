// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface UserPayload {
  userId: string;
  isAdmin: boolean;
  community: string;
}

// Pour étendre l'objet Request d'Express
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Accès non autorisé' });
  }

  const token = bearer.split(' ')[1].trim();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
    req.user = payload;
    next();
  } catch (error) {
    console.error('Erreur de token JWT:', error);
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: "Accès refusé. Seuls les administrateurs peuvent effectuer cette action.",
    });
  }
  next();
};