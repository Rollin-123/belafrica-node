import express from 'express';
import { User } from '../models/User.model';
import { smsService } from '../services/sms.service';
import { geolocationService } from '../services/geolocation.service';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ✅ ENVOYER L'OTP AVEC GÉOLOCALISATION
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone et code pays requis'
      });
    }

    // Valider le format du numéro
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const isValidPhone = await smsService.validatePhoneNumber(cleanPhone);
    
    if (!isValidPhone) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone invalide ou pays non autorisé'
      });
    }

    // Géolocalisation
    const geoData = await geolocationService.getLocationByIP(clientIP);
    
    if (!geolocationService.isCountryAllowed(geoData.countryCode)) {
      return res.status(400).json({
        success: false,
        error: 'Service non disponible dans votre pays'
      });
    }

    // Vérifier la cohérence pays numéro/pays géolocalisation
    const phoneCountryCode = cleanPhone.substring(1, 3);
    const isConsistent = geolocationService.validateCountryConsistency(
      phoneCountryCode,
      geoData.countryCode
    );

    if (!isConsistent) {
      return res.status(400).json({
        success: false,
        error: 'Incohérence détectée entre votre numéro et votre localisation'
      });
    }

    // Générer OTP
    const otpCode = smsService.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Chercher ou créer l'utilisateur
    let user = await User.findOne({ phoneNumber: cleanPhone });

    if (user) {
      // Mettre à jour l'OTP existant
      user.otpCode = otpCode;
      user.otpExpires = otpExpires;
      user.ipAddress = clientIP;
      user.detectedCountry = geoData.country;
      user.timezone = geoData.timezone;
    } else {
      // Créer un nouvel utilisateur
      user = new User({
        phoneNumber: cleanPhone,
        countryCode,
        countryName: geoData.country,
        ipAddress: clientIP,
        detectedCountry: geoData.country,
        timezone: geoData.timezone,
        otpCode,
        otpExpires,
        isVerified: false,
        pseudo: 'Utilisateur',
        community: 'À définir',
        nationality: 'À définir',
        nationalityName: 'À définir'
      });
    }

    await user.save();

    // Envoyer l'OTP
    const smsResult = await smsService.sendOTP(cleanPhone, otpCode);

    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'envoi du SMS'
      });
    }

    res.json({
      success: true,
      message: 'Code de vérification envoyé',
      // En développement, retourner l'OTP pour les tests
      ...(process.env.NODE_ENV === 'development' && { otpCode }),
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        countryName: user.countryName
      }
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

    // Vérifier l'OTP
    if (!user.isOTPValid(otpCode)) {
      return res.status(400).json({
        success: false,
        error: 'Code OTP incorrect ou expiré'
      });
    }

    // OTP valide - mettre à jour l'utilisateur
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Générer le token JWT
    const token = jwt.sign(
      {
        userId: user._id,
        phoneNumber: user.phoneNumber,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.json({
      success: true,
      message: 'Compte vérifié avec succès',
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        countryName: user.countryName,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin
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
    user.community = user.generateCommunityName();

    await user.save();

    res.json({
      success: true,
      message: 'Nationalité définie avec succès',
      user: {
        id: user._id,
        community: user.community,
        nationality: user.nationality,
        nationalityName: user.nationalityName,
        countryName: user.countryName
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