import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService = new AuthService();

  async requestOTP(req: Request, res: Response) {
    try {
      const { phoneNumber, countryCode } = req.body;
      const userIP = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      if (!phoneNumber || !countryCode) {
        return res.status(400).json({
          success: false,
          error: 'Numéro de téléphone et code pays requis'
        });
      }

      const result = await this.authService.requestOTP(phoneNumber, countryCode, userIP as string);
      
      if (!result.success) {
        return res.status(403).json(result);
      }

      res.json(result);
      
    } catch (error: any) {
      console.error('🔥 Erreur requestOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }

  async verifyOTP(req: Request, res: Response) {
    try {
      const { phoneNumber, code } = req.body;
      
      if (!phoneNumber || !code) {
        return res.status(400).json({
          success: false,
          error: 'Numéro et code requis'
        });
      }

      const result = await this.authService.verifyOTP(phoneNumber, code);
      
      if (!result.success) {
        return res.status(401).json(result);
      }

      res.json(result);
      
    } catch (error: any) {
      console.error('🔥 Erreur verifyOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  }

  async completeProfile(req: Request, res: Response) {
    try {
      const profileData = req.body;
      
      if (!profileData.phoneNumber || !profileData.nationality || !profileData.pseudo) {
        return res.status(400).json({
          success: false,
          error: 'Données manquantes'
        });
      }

      // Calculer la communauté si manquante
      if (!profileData.community && profileData.nationalityName && profileData.countryName) {
        profileData.community = `${profileData.nationalityName}En${profileData.countryName.replace(/\s/g, '')}`;
      }

      const result = await this.authService.completeProfile(profileData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
      
    } catch (error: any) {
      console.error('🔥 Erreur completeProfile:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur création profil'
      });
    }
  }

  async verifyToken(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          valid: false,
          error: 'Token manquant'
        });
      }

      // Simulation - dans la réalité, vérifier avec JWT
      res.json({
        valid: true,
        message: 'Token valide'
      });
      
    } catch (error: any) {
      console.error('🔥 Erreur verifyToken:', error);
      res.status(401).json({
        valid: false,
        error: 'Token invalide'
      });
    }
  }
}