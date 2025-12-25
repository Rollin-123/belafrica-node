import { Request, Response } from 'express';
import { APP_CONSTANTS } from '../utils/constants';

/**
 * Expose les constantes publiques de l'application au frontend.
 */
export const getAppConstants = (req: Request, res: Response) => {
  // Ne pas exposer les secrets ou les variables d'environnement sensibles !
  const publicConstants = {
    AFRICAN_COUNTRIES: APP_CONSTANTS.AFRICAN_COUNTRIES,
    COUNTRY_NAMES: APP_CONSTANTS.COUNTRY_NAMES,
    PHONE_COUNTRY_MAPPING: APP_CONSTANTS.PHONE_COUNTRY_MAPPING, // ✅ Exposer ce mapping
  };
  res.status(200).json({ success: true, data: publicConstants });
};