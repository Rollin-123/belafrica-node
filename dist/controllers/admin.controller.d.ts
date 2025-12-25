import { Request, Response } from 'express';
/**
 * Génère un code d'administration.
 */
export declare const generateAdminCode: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Valide un code et promeut un utilisateur au rang d'administrateur.
 */
export declare const validateAdminCode: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Récupère tous les codes admin actifs (non utilisés et non expirés).
 * Réservé aux super-administrateurs.
 */
export declare const getAdminCodes: (req: Request, res: Response) => Promise<void>;
/**
 * Supprime (invalide) un code admin.
 * Réservé aux super-administrateurs.
 */
export declare const deleteAdminCode: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=admin.controller.d.ts.map