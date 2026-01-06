// src/controllers/debug.controller.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response } from 'express';
import { detectCountryByIP } from '../utils/geolocation';


export const getGeoDebug = async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const location = await detectCountryByIP(ip);

    res.json({
      success: true,
      ip: ip,
      location: location,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const postTestValidation = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({ success: false, error: 'Numéro et code pays requis' });
    }

    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const location = await detectCountryByIP(ip);

    res.json({
      success: true,
      clientIP: ip,
      location: location,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};