import express from 'express';
import { User } from '../models/User.model';
import { SMSService } from '../services/sms.service';
import { GeolocationService } from '../services/geolocation.service';

const router = express.Router();

// ✅ ENVOYER L'OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, countryCode } = req.body;

    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone et code pays requis'
      });
    }

    // Valider le format du numéro
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Format de numéro invalide'
      });
    }

    // Générer OTP
    const otpCode = SMSService.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 
    
    // Vérifier si l'utilisateur existe
    let user = await User.findOne({ phoneNumber: cleanPhone });

    if (user) {
      // Mettre à jour l'OTP existant
      user.otpCode = otpCode;
      user.otpExpires = otpExpires;
    } else {
      // Créer un nouvel utilisateur temporaire
      user = new User({
        phoneNumber: cleanPhone,
        countryCode,
        countryName: 'À définir', // Sera mis à jour après nationalité
        otpCode,
        otpExpires,
        isVerified: false,
        pseudo: 'Utilisateur',
        community: 'À définir'
      });
    }

    await user.save();

    // Envoyer l'OTP
    const smsResult = await SMSService.sendOTP(cleanPhone, otpCode);

    res.json({
      success: true,
      message: smsResult.message,
      otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
    });

  } catch (error: any) {
    console.error('❌ Erreur envoi OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ VÉRIFIER L'OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({
        success: false,
        error: 'Numéro et code OTP requis'
      });
    }

    const user = await User.findOne({ 
      phoneNumber: phoneNumber.replace(/\s/g, '')
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Vérifier l'OTP et son expiration
    if (user.otpCode !== otpCode) {
      return res.status(400).json({
        success: false,
        error: 'Code OTP incorrect'
      });
    }

    if (user.otpExpires && new Date() > user.otpExpires) {
      return res.status(400).json({
        success: false,
        error: 'Code OTP expiré'
      });
    }

    // OTP valide - mettre à jour l'utilisateur
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'OTP vérifié avec succès',
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        isVerified: user.isVerified
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur vérification OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ DÉFINIR LA NATIONALITÉ
router.post('/set-nationality', async (req, res) => {
  try {
    const { phoneNumber, nationality, nationalityName } = req.body;

    if (!phoneNumber || !nationality || !nationalityName) {
      return res.status(400).json({
        success: false,
        error: 'Toutes les informations sont requises'
      });
    }

    const user = await User.findOne({ 
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      isVerified: true 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non vérifié ou non trouvé'
      });
    }

    // Mettre à jour les informations
    user.nationality = nationality;
    user.nationalityName = nationalityName;
    
    // Générer le nom de la communauté
    const cleanCountry = user.countryName.replace(/\s/g, '');
    user.community = `${nationalityName}En${cleanCountry}`;

    await user.save();

    res.json({
      success: true,
      message: 'Nationalité définie avec succès',
      user: {
        id: user._id,
        community: user.community,
        nationality: user.nationality,
        nationalityName: user.nationalityName
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur définition nationalité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

export default router;