/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { AuthService } from '../services/auth.service';
import { getGeolocationService } from '../services/geolocation.service';

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

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, countryCode } = req.body;
  const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;

  if (!phoneNumber || !countryCode) {
    res.status(400);
    throw new Error('Le numero de telephone et le code pays sont requis.');
  }

  // GEO-VALIDATION : active uniquement si GEO_VALIDATION_ENABLED=true dans Render
  const geoEnabled = process.env.GEO_VALIDATION_ENABLED === 'true';

  if (process.env.NODE_ENV?.trim() === 'production' && geoEnabled) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    const locationData = await geolocationService.detectLocationByIP(ip);

    if (locationData.isProxy) {
      res.status(403);
      throw new Error('L\'utilisation de VPNs ou proxys est interdite pour des raisons de securite.');
    }

    const isValidMatch = geolocationService.validatePhoneCountryMatch(countryCode, locationData.countryCode);
    if (!isValidMatch) {
      res.status(403);
      throw new Error('Votre localisation ne correspond pas au pays de votre numero de telephone.');
    }
  } else {
    console.log('Info: Geo-validation desactivee (GEO_VALIDATION_ENABLED != true)');
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id, is_verified')
    .eq('phone_number', fullPhoneNumber)
    .single();

  const userExists = !!(existingUser && existingUser.is_verified);
  const otpCode = generateOtpCode();
  const { token } = await authService.saveOTPWithToken(fullPhoneNumber, otpCode);

  if (!token) {
    throw new Error('Impossible de generer un token de verification.');
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Belafrica_bot';
  const telegramLink = `https://t.me/${botUsername}?start=${token}`;
  const mobileLink = `tg://resolve?domain=${botUsername}&start=${token}`;

  res.status(200).json({
    success: true,
    message: userExists
      ? 'Utilisateur reconnu. Veuillez verifier votre identite pour vous connecter.'
      : 'OTP genere. Cliquez sur le lien pour recevoir votre code.',
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

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, code } = req.body;

  if (!phoneNumber || !code) {
    res.status(400);
    throw new Error('Numero de telephone et code OTP requis.');
  }

  const otpData = await authService.verifyOTP(phoneNumber, code);

  if (!otpData) {
    res.status(401);
    throw new Error('Code OTP invalide ou expire.');
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (existingUser && existingUser.is_verified) {
    const token = jwt.sign({ userId: existingUser.id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });
    res.status(200).json({
      success: true,
      message: 'Connexion reussie.',
      user: existingUser,
      token: token,
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
    message: 'Code verifie avec succes.',
    tempToken,
  });
});

export const completeProfile = asyncHandler(async (req: Request, res: Response) => {
  const phoneNumber = req.phoneNumber;

  if (!phoneNumber) {
    res.status(401);
    throw new Error('Token invalide ou session expiree.');
  }

  const { countryCode, countryName, nationality, nationalityName, pseudo, email, avatar, community } = req.body;

  if (!pseudo || !countryName || !nationalityName || !community) {
    res.status(400);
    throw new Error('Le pseudo, le pays, la nationalite et la communaute sont requis.');
  }

  const finalUser = await authService.upsertUser({
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
    role: 'USER'
  });

  if (!finalUser) {
    throw new Error('Impossible de creer ou de retrouver l\'utilisateur apres la mise a jour.');
  }

  const finalToken = jwt.sign(
    { userId: finalUser.id },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  res.status(200).json({
    success: true,
    message: 'Profil cree avec succes.',
    user: finalUser,
    token: finalToken,
  });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Non autorisé.');
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé.');
  }

  res.status(200).json({ success: true, user });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Non autorisé.');
  }

  const { pseudo, bio, gender, profession, interests, avatar_url } = req.body;

  // Validation
  if (pseudo !== undefined && (typeof pseudo !== 'string' || pseudo.trim().length < 2)) {
    res.status(400);
    throw new Error('Le pseudo doit contenir au moins 2 caractères.');
  }

  // Construire l'objet de mise à jour (seulement les champs fournis)
  const updateData: any = { updated_at: new Date().toISOString() };
  if (pseudo !== undefined) updateData.pseudo = pseudo.trim();
  if (bio !== undefined) updateData.bio = bio;
  if (gender !== undefined) updateData.gender = gender;
  if (profession !== undefined) updateData.profession = profession;
  if (interests !== undefined) updateData.interests = interests;
  if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !updatedUser) {
    res.status(500);
    throw new Error('Impossible de mettre à jour le profil: ' + error?.message);
  }

  res.status(200).json({ success: true, user: updatedUser });
});
