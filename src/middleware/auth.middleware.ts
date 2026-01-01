import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';

/**
 * Wrapper pour les middlewares asynchrones afin de catcher les erreurs.
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Middleware pour vérifier si un utilisateur est authentifié via un token JWT.
 * Il récupère le token de l'en-tête 'Authorization', le valide avec Supabase,
 * et attache l'ID de l'utilisateur à l'objet `req` pour les prochains middlewares/contrôleurs.
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
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
        return res.status(401).json({ success: false, error: 'Non autorisé, utilisateur non trouvé.' });
      }

      // 3. Attacher l'objet utilisateur complet à la requête
      // @ts-ignore
      req.user = user;
      next();

    } catch (error) {
      return res.status(401).json({ success: false, error: 'Non autorisé: Token invalide ou expiré.' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Non autorisé, pas de token' });
  }
};

export const protectTemp = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Extraire le token
      token = req.headers.authorization.split(' ')[1];

      // 2. Vérifier le token avec la clé secrète TEMPORAIRE
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, temp: boolean };

      // 3. S'assurer que c'est bien un token temporaire
      if (!decoded.temp) {
        return res.status(401).json({ success: false, error: 'Non autorisé, token invalide.' });
      }

      // 4. Attacher le payload décodé à la requête
      // @ts-ignore
      req.user = { id: decoded.userId }; // On a juste besoin de l'ID pour `completeProfile`
      next();
    } catch (error) {
      console.error('Erreur de token temporaire:', error);
      return res.status(401).json({ success: false, error: 'Non autorisé, le token temporaire a échoué' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Non autorisé, pas de token temporaire' });
  }
});

/**
 * Middleware pour vérifier si l'utilisateur authentifié est un administrateur (simple ou super).
 * Doit être utilisé APRÈS le middleware `protect` qui attache l'objet utilisateur.
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  const user = req.user;

  if (!user || !user.is_admin) {
    return res.status(403).json({ success: false, error: 'Accès refusé: Permissions d\'administrateur requises.' });
  }
  next();
};
/**
 * Middleware pour vérifier si l'utilisateur authentifié est un super-administrateur.
 * Doit être utilisé APRÈS le middleware `protect`.
 * Il vérifie le rôle de l'utilisateur dans la base de données.
 */
export const isSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  const user = req.user;

  if (!user || user.admin_level !== 'super') {
    return res.status(403).json({ success: false, error: 'Accès refusé: Permissions de super-administrateur requises.' });
  }
  next();
};
