/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { APP_CONSTANTS } from '../utils/constants';

export const verifyCountryByIp = (expectedCountrySource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {

    // Si GEO_VALIDATION_ENABLED n'est pas "true", on laisse passer sans verifier
    const geoEnabled = process.env.GEO_VALIDATION_ENABLED === 'true';
    if (!geoEnabled) {
      console.log('Info: Geo-validation desactivee (GEO_VALIDATION_ENABLED != true)');
      return next();
    }

    const bypassGeo = process.env.GEO_BYPASS_IN_DEV === 'true';
    if (bypassGeo) {
      console.log('GEO: Bypass de la verification en mode developpement.');
      return next();
    }

    const testIp = req.headers['x-test-ip'] as string;
    const ip = testIp || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress;

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const geo = response.data;

      if (geo.status !== 'success') {
        console.warn('GEO: Echec de la localisation pour l IP ' + ip + '. Raison: ' + geo.message);
        return res.status(403).json({
          success: false,
          error: 'Votre localisation n a pas pu etre verifiee. Veuillez reessayer.'
        });
      }

      const detectedIpCountry = geo.countryCode;
      console.log('GEO: IP=' + ip + ', Pays detecte=' + detectedIpCountry + ' (' + geo.country + ')');

      const expectedPhoneCode = req.body[expectedCountrySource];
      if (!expectedPhoneCode) {
        return res.status(400).json({
          success: false,
          error: 'Le code pays attendu est manquant.'
        });
      }

      const allowedIsoCodes = APP_CONSTANTS.PHONE_COUNTRY_MAPPING[expectedPhoneCode as keyof typeof APP_CONSTANTS.PHONE_COUNTRY_MAPPING];

      if (!allowedIsoCodes || !allowedIsoCodes.includes(detectedIpCountry)) {
        console.warn('GEO: Tentative detctee ! IP de ' + detectedIpCountry + ', mais attendu pour ' + (allowedIsoCodes ? allowedIsoCodes.join('/') : 'inconnu'));
        return res.status(403).json({
          success: false,
          error: 'La localisation de votre connexion ne correspond pas au pays de votre numero. L utilisation de VPN est interdite.'
        });
      }

      console.log('GEO: Verification de la localisation reussie.');
      next();

    } catch (error: any) {
      console.error('Erreur dans le middleware de geolocalisation:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Erreur du service de geolocalisation.'
      });
    }
  };
};
