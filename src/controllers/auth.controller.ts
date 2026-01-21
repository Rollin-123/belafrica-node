/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../services/auth.service';
import { getGeolocationService } from '../services/geolocation.service';

// Fonction pour générer un code OTP simple
const generateOtpCode = (length = 6): string => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) code += digits[Math.floor(Math.random() * 10)];
  return code;
};

const authService = new AuthService();
const geolocationService = getGeolocationService();

const phonePrefixToCountryISO: { [key: string]: string } = {
  '+49': 'DE',
  '+32': 'BE', 
  '+375': 'BY', 
  '+1': 'CA',  
  '+34': 'ES',
  '+33': 'FR', 
  '+39': 'IT', 
  '+41': 'CH', 
  '+44': 'GB',
  '+7': 'RU' 
};

/**
 * Demande un code OTP (One-Time Password) via Supabase Auth.
 * La géolocalisation est vérifiée ici.
 */
export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, countryCode } = req.body;
  const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;

  if (!phoneNumber || !countryCode) {
    res.status(400);
    throw new Error('Le numéro de téléphone et le code pays sont requis.');
  }

  // =================================================
  // ✅ NOUVELLE LOGIQUE DE GÉO-VALIDATION
  // =================================================
  // Cette vérification est active sauf si GEO_BYPASS_IN_DEV est 'true'
  if (process.env.GEO_BYPASS_IN_DEV !== 'true') { 
    // 1. Obtenir l'IP réelle de l'utilisateur (Render utilise 'x-forwarded-for')
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    const locationData = await geolocationService.detectLocationByIP(ip);

    // 2. Vérifier si un VPN/Proxy est utilisé
    if (locationData.isProxy) {
      res.status(403);
      throw new Error('L\'utilisation de VPNs, proxys ou services d\'anonymisation est interdite pour des raisons de sécurité.');
    }

    // 3. Vérifier la correspondance entre le pays de l'IP et le pays du numéro de téléphone
    const isValidMatch = geolocationService.validatePhoneCountryMatch(countryCode, locationData.countryCode);
    if (!isValidMatch) {
      res.status(403);
      throw new Error(`Votre localisation détectée (${locationData.country}) ne correspond pas au pays de votre numéro de téléphone. Pour des raisons de sécurité, veuillez désactiver tout VPN et réessayer.`);
    }
  }

  // ✅ NOUVEAU : Vérifier si l'utilisateur existe déjà pour personnaliser l'expérience
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, is_verified')
    .eq('phone_number', fullPhoneNumber)
    .single();

  const userExists = !!(existingUser && existingUser.is_verified);

  // 1. Générer le code et le token
  const otpCode = generateOtpCode();

  // 2. Sauvegarder l'OTP et le token via le service
  const { token } = await authService.saveOTPWithToken(fullPhoneNumber, otpCode);

  if (!token) {
    throw new Error("Impossible de générer un token de vérification.");
  }

  // 3. Créer les liens de deep linking
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Belafrica_bot';
  const telegramLink = `https://t.me/${botUsername}?start=${token}`;
  const mobileLink = `tg://resolve?domain=${botUsername}&start=${token}`;

  // 4. Retourner une réponse riche pour le frontend
  res.status(200).json({
    success: true,
    message: userExists 
        ? 'Utilisateur reconnu. Veuillez vérifier votre identité pour vous connecter.' 
        : 'OTP généré. Cliquez sur le lien pour recevoir votre code.',
    requiresBotStart: true, 
    userExists: userExists,  
    token: token,
    links: {
      web: telegramLink,
      app: mobileLink,
      universal: telegramLink,
    },
  });
});

/**
 * Vérifie un code OTP et retourne une session (token JWT).
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
        res.status(400);
        throw new Error('Numéro de téléphone et code OTP requis.');
    }
    // 1. Vérifier l'OTP via le service
    const otpData = await authService.verifyOTP(phoneNumber, code);

    if (!otpData) {
        res.status(401);
        throw new Error('Code OTP invalide ou expiré.');
    }

    // 3. Check if user already exists and is verified
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

        
    if (existingUser && existingUser.is_verified) {
        const token = jwt.sign({ userId: existingUser.id }, process.env.JWT_SECRET!, {
            expiresIn: '7d',
        });

        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000  
        });

        res.status(200).json({
            success: true,
            message: 'Connexion réussie.',
            user: existingUser,
        });
        return;
    }

    const tempToken = jwt.sign(
        { phoneNumber: phoneNumber, temp: true }, 
        process.env.TEMP_JWT_SECRET || process.env.JWT_SECRET!, 
        { expiresIn: '15m' }
    );

    res.json({
        success: true,
        message: 'Code vérifié avec succès.',
        tempToken,
    });
});

export const completeProfile = asyncHandler(async (req: Request, res: Response) => {
  const phoneNumber = req.phoneNumber;  

  if (!phoneNumber) {
    res.status(401);
    throw new Error('Token invalide ou session expirée.');
  }

  const { countryCode, countryName, nationality, nationalityName, pseudo, email, avatar, community } = req.body;

  if (!pseudo || !countryName || !nationalityName || !community) {
    res.status(400);
    throw new Error('Le pseudo, le pays, la nationalité et la communauté sont requis.');
  }

  const finalUser = await authService.upsertUser({
    id: uuidv4(), 
    phone_number: phoneNumber, 
    country_code: countryCode,
    country_name: countryName,
    nationality: nationality,
    nationality_name: nationalityName,
    community: community,
    pseudo: pseudo,
    email: email,
    avatar_url: avatar,
    is_verified: true, 
    updated_at: new Date().toISOString(),
    role: 'user'
  });

  if (!finalUser) {
    throw new Error("Impossible de créer ou de retrouver l'utilisateur après la mise à jour.");
  }

  const finalToken = jwt.sign(
      { userId: finalUser.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
  );
  
    res.cookie('access_token', finalToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000  
    });

    res.status(200).json({
        success: true,
        message: 'Profil créé avec succès.',
        user: finalUser,
    });
});
