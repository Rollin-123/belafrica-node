import { Request, Response } from 'express';
/**
 * Demande un code OTP (One-Time Password) via Supabase Auth.
 * La géolocalisation est vérifiée ici.
 */
export declare const requestOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Vérifie un code OTP et retourne une session (token JWT).
 */
export declare const verifyOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const completeProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.controller.d.ts.map