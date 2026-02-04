/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response } from 'express';
import { APP_CONSTANTS } from '../utils/constants';
import { bot } from '../services/telegram.service';


/**
 * Expose les constantes publiques de l'application au frontend.
 */
export const getAppConstants = (req: Request, res: Response) => {
  const publicConstants = {
    AFRICAN_COUNTRIES: APP_CONSTANTS.AFRICAN_COUNTRIES,
    COUNTRY_NAMES: APP_CONSTANTS.COUNTRY_NAMES,
    PHONE_COUNTRY_MAPPING: APP_CONSTANTS.PHONE_COUNTRY_MAPPING,  
  };
  res.status(200).json({ success: true, data: publicConstants });
};

export const handleTelegramWebhook = (req: Request, res: Response) => {
  if (bot) {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } else {
    console.error('⚠️ Tentative de webhook mais le bot n\'est pas initialisé.');
    res.sendStatus(500);
  }
};