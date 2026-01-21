/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response, NextFunction } from 'express';  
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { UserPayload } from '../types/user';

 
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;
  token = req.cookies?.access_token;
  if (token) {
    try {
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
      req.user = user;  
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Non autorisé: Token invalide ou expiré.');
    }
  } else {
    res.status(401);
    throw new Error('Non autorisé, pas de token');
  }
});

export const protectTemp = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Extraire le token
      token = req.headers.authorization.split(' ')[1]; 

      // 2. Vérifier le token avec la clé secrète TEMPORAIRE
      const decoded = jwt.verify(token, process.env.TEMP_JWT_SECRET!) as { phoneNumber: string, temp: boolean };
      console.log('Decoded temp token in protectTemp:', decoded);  

      // 3. S'assurer que c'est bien un token temporaire
      if (!decoded.temp || !decoded.phoneNumber) {
        res.status(401);
        throw new Error('Non autorisé, token temporaire invalide.');
      }

      req.phoneNumber = decoded.phoneNumber;  
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
 
export const isAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user || !user.is_admin) {
    res.status(403);
    throw new Error('Accès refusé: Permissions d\'administrateur requises.');
  }
  next();
}); 

export const isSuperAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user || user.admin_level !== 'super') {
    res.status(403);
    throw new Error('Accès refusé: Permissions de super-administrateur requises.');
  }
  next();
});
