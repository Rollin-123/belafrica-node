// src/middleware/admin.middleware.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response, NextFunction } from 'express';  
import { getSupabaseService } from '../services/supabase.service';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Non authentifié'
      });
    }

    const supabase = getSupabaseService();
    const user = await supabase.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    if (!user.is_admin) {
      return res.status(403).json({
        error: 'Permissions administrateur requises'
      });
    }

    // Vérifier les permissions spécifiques si nécessaire
    const requiredPermission = req.requiredPermission; 
    if (requiredPermission && user.admin_permissions) {
      if (!user.admin_permissions.includes(requiredPermission)) {
        return res.status(403).json({
          error: `Permission ${requiredPermission} requise`
        });
      }
    }

    next();
  } catch (error: any) {
    console.error('🔥 Erreur adminMiddleware:', error);
    return res.status(500).json({
      error: 'Erreur de vérification des permissions'
    });
  }
}
