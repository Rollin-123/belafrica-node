import { Request, Response, NextFunction } from 'express';
/**
 * Middleware pour vérifier si un utilisateur est authentifié via un token JWT.
 * Il récupère le token de l'en-tête 'Authorization', le valide avec Supabase,
 * et attache l'ID de l'utilisateur à l'objet `req` pour les prochains middlewares/contrôleurs.
 */
export declare const protect: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware pour vérifier si l'utilisateur authentifié est un administrateur (simple ou super).
 * Doit être utilisé APRÈS le middleware `protect`.
 */
export declare const isAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Middleware pour vérifier si l'utilisateur authentifié est un super-administrateur.
 * Doit être utilisé APRÈS le middleware `protect`.
 * Il vérifie le rôle de l'utilisateur dans la base de données.
 */
export declare const isSuperAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.middleware.d.ts.map