import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';

/**
 * Middleware pour vérifier si un utilisateur est authentifié via un token JWT.
 * Il récupère le token de l'en-tête 'Authorization', le valide avec Supabase,
 * et attache l'ID de l'utilisateur à l'objet `req` pour les prochains middlewares/contrôleurs.
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // 1. Valider le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

      // 2. Récupérer l'utilisateur depuis Supabase pour avoir les données à jour
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        res.status(401);
        throw new Error('Non autorisé, utilisateur non trouvé.');
      }

      // 3. Attacher l'objet utilisateur complet à la requête
      // @ts-ignore
      req.user = user;
      next();

    } catch (error) {
      res.status(401);
      throw new Error('Non autorisé: Token invalide ou expiré.');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Non autorisé, pas de token');
  }
});

// @ts-ignore
export const protectTemp = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Extraire le token
      token = req.headers.authorization.split(' ')[1];

      // 2. Vérifier le token avec la clé secrète TEMPORAIRE
      const decoded = jwt.verify(token, process.env.TEMP_JWT_SECRET!) as { phoneNumber: string, temp: boolean };
      console.log('Decoded temp token in protectTemp:', decoded); // Debugging line

      // 3. S'assurer que c'est bien un token temporaire
      if (!decoded.temp || !decoded.phoneNumber) {
        res.status(401);
        throw new Error('Non autorisé, token temporaire invalide.');
      }

      // 4. Attacher le payload décodé à la requête
      // @ts-ignore
      req.user = decoded; // req.user sera { phoneNumber: '...', temp: true }
      next();
    } catch (error) {
      console.error('Erreur de token temporaire:', error);
      res.status(401);
      throw new Error('Non autorisé, le token temporaire a échoué');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Non autorisé, pas de token temporaire');
  }
});

/**
 * Middleware pour vérifier si l'utilisateur authentifié est un administrateur (simple ou super).
 * Doit être utilisé APRÈS le middleware `protect` qui attache l'objet utilisateur.
 */
export const isAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  const user = req.user;

  if (!user || !user.is_admin) {
    res.status(403);
    throw new Error('Accès refusé: Permissions d\'administrateur requises.');
  }
  next();
});
/**
 * Middleware pour vérifier si l'utilisateur authentifié est un super-administrateur.
 * Doit être utilisé APRÈS le middleware `protect`.
 * Il vérifie le rôle de l'utilisateur dans la base de données.
 */
export const isSuperAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  const user = req.user;

  if (!user || user.admin_level !== 'super') {
    res.status(403);
    throw new Error('Accès refusé: Permissions de super-administrateur requises.');
  }
  next();
});
