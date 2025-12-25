import { Request, Response, NextFunction } from 'express';
/**
 * Middleware pour vérifier que l'IP de l'utilisateur correspond au pays attendu.
 * Le pays attendu est passé en paramètre dans le corps de la requête.
 * @param expectedCountrySource - La clé dans `req.body` qui contient le code pays attendu (ex: '+33').
 */
export declare const verifyCountryByIp: (expectedCountrySource: string) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=geoip.middleware.d.ts.map