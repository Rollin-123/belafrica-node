import { Request, Response } from 'express';
/**
 * Génère un code d'administration.
 * Réservé aux super-administrateurs (logique de super-admin à définir, pour l'instant on se base sur is_admin).
 */
export declare const generateAdminCode: (req: Request, res: Response) => Promise<void>;
/**
 * Valide un code et promeut un utilisateur au rang d'administrateur.
 * Accessible par un utilisateur connecté.
 */
export declare const validateAdminCode: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=admin.controller.d.ts.map