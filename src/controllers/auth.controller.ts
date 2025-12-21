// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { detectCountryByIP, getClientIP, validatePhoneCountryMatch } from '../utils/geolocation';
import jwt from 'jsonwebtoken';
import { APP_CONSTANTS } from '../utils/constants';

export const requestOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, countryCode } = req.body;

    // Validation basique
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone et code pays requis'
      });
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    // ✅ CORRECTION IMPORTANTE : Utiliser getClientIP au lieu de req.ip
    const clientIP = getClientIP(req);
    console.log('🌍 Détection IP:', {
      clientIP: clientIP,
      reqIP: req.ip,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      }
    });
    
    const location = await detectCountryByIP(clientIP);

    console.log('📍 Localisation détectée:', { 
      ip: clientIP, 
      country: location.country, 
      code: location.countryCode,
      success: location.success 
    });

    // ✅ VALIDATION GÉOLOCALISATION AVEC BYPASS POSSIBLE
    if (APP_CONSTANTS.GEO_VALIDATION_ENABLED) {
      // Si en développement et bypass activé, on saute la validation
      if (process.env.NODE_ENV === 'development' && APP_CONSTANTS.GEO_BYPASS_IN_DEV) {
        console.log('🔧 BYPASS ACTIVÉ: Validation géolocalisation ignorée en développement');
      } else {
        const validation = validatePhoneCountryMatch(countryCode, location.countryCode);
        
        if (!validation.isValid) {
          console.log('❌ Validation géolocalisation échouée:', {
            phoneCode: countryCode,
            detected: location.countryCode,
            error: validation.error
          });
          
          return res.status(403).json({
            success: false,
            error: validation.error || 'Localisation non valide',
            detectedCountry: location.country,
            detectedCountryCode: location.countryCode,
            phoneCountryCode: countryCode,
            bypassAvailable: APP_CONSTANTS.GEO_BYPASS_IN_DEV,
            environment: process.env.NODE_ENV
          });
        }
      }
    } else {
      console.log('⚠️ Validation géolocalisation désactivée (GEO_VALIDATION_ENABLED = false)');
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, pseudo, community, is_admin')
      .eq('phone_number', fullPhoneNumber)
      .single();

    // Si utilisateur existe
    if (existingUser && !userError) {
      console.log('👤 Utilisateur existant trouvé:', existingUser.pseudo);
      
      return res.json({ 
        success: true, 
        message: 'Utilisateur existant', 
        userExists: true, 
        requiresOTP: true,
        user: {
          pseudo: existingUser.pseudo,
          community: existingUser.community,
          isAdmin: existingUser.is_admin
        }
      });
    }

    // Générer OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log(`🔑 OTP généré: ${otpCode} pour ${fullPhoneNumber}`);

    // Supprimer les anciens OTP pour ce numéro
    await supabase
      .from('otp_codes')
      .delete()
      .eq('phone_number', fullPhoneNumber);

    // Sauvegarder le nouvel OTP
    const { error: otpError } = await supabase
      .from('otp_codes')
      .insert([{
        phone_number: fullPhoneNumber,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        verified: false,
        location_data: {
          ip: clientIP,
          country: location.country,
          countryCode: location.countryCode,
          city: location.city
        }
      }]);

    if (otpError) {
      console.error('❌ Erreur sauvegarde OTP:', otpError);
      return res.status(500).json({
        success: false,
        error: 'Erreur génération OTP'
      });
    }

    // 🚀 ENVOYER OTP VIA TELEGRAM (optionnel)
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CREATOR_CHAT_ID;
    
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        const telegramMessage = `📱 BELAFRICA - Nouvelle demande OTP
• Numéro: ${fullPhoneNumber}
• Code: ${otpCode}
• Localisation: ${location.country} (${location.city})
• IP: ${clientIP}
• Pays détecté: ${location.countryCode}
• Date: ${new Date().toLocaleString('fr-FR')}`;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: telegramMessage,
            parse_mode: 'HTML'
          })
        });
        
        console.log('✅ Notification Telegram envoyée');
      } catch (telegramError) {
        console.error('⚠️ Erreur Telegram:', telegramError);
      }
    }

    res.json({
      success: true,
      message: 'OTP généré avec succès',
      code: otpCode, // ⚠️ À RETIRER EN PRODUCTION RÉELLE
      phoneNumber: fullPhoneNumber,
      expiresIn: '10 minutes',
      detectedCountry: location.country,
      detectedCountryCode: location.countryCode,
      city: location.city,
      environment: process.env.NODE_ENV,
      geoValidation: {
        enabled: APP_CONSTANTS.GEO_VALIDATION_ENABLED,
        bypassInDev: APP_CONSTANTS.GEO_BYPASS_IN_DEV,
        validationResult: location.success ? 'SUCCESS' : 'FAILED'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erreur requestOtp:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur interne du serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ verifyOtp reste identique
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;

    const { data: otpData, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !otpData) {
      return res.status(401).json({ success: false, error: 'Code OTP invalide ou expiré' });
    }

    await supabase.from('otp_codes').update({ verified: true }).eq('id', otpData.id);

    console.log('✅ OTP validé pour:', phoneNumber);
    res.json({ success: true, verified: true, message: 'OTP vérifié avec succès' });
  } catch (error: any) {
    console.error('❌ Erreur verifyOtp:', error);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
  }
};

// ✅ completeProfile reste identique
export const completeProfile = async (req: Request, res: Response) => {
  try {
    const profileData = req.body;

    const { data: existingUser } = await supabase.from('users').select('id').eq('phone_number', profileData.phoneNumber).single();
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Un utilisateur avec ce numéro existe déjà' });
    }

    const userData = {
      phone_number: profileData.phoneNumber,
      country_code: profileData.countryCode,
      country_name: profileData.countryName || 'Unknown',
      nationality: profileData.nationality,
      nationality_name: profileData.nationalityName,
      pseudo: profileData.pseudo,
      email: profileData.email,
      avatar_url: profileData.avatar || null,
      community: profileData.community,
    };

    const { data: newUser, error: insertError } = await supabase.from('users').insert([userData]).select().single();

    if (insertError) {
      console.error('❌ Erreur création utilisateur:', insertError);
      return res.status(500).json({ success: false, error: 'Erreur création utilisateur' });
    }

    console.log('✅ Utilisateur créé:', newUser.id);

    // ✅ Génération d'un token JWT sécurisé
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ Secret JWT manquant. Définir JWT_SECRET dans .env');
      return res.status(500).json({ success: false, error: 'Erreur de configuration serveur' });
    }

    const payload = { 
      userId: newUser.id, 
      isAdmin: newUser.is_admin,
      community: newUser.community
    };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token: token,
      user: {
        id: newUser.id,
        pseudo: newUser.pseudo,
        community: newUser.community,
        isAdmin: newUser.is_admin,
        avatar: newUser.avatar_url,
      },
      message: 'Profil créé avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur completeProfile:', error);
    res.status(500).json({ success: false, error: 'Erreur création profil' });
  }
};