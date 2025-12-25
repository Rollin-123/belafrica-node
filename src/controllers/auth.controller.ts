import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';
import { sendTelegramMessage } from '../services/telegram.service';

// Fonction pour générer un code OTP simple
const generateOtpCode = (length = 6): string => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) code += digits[Math.floor(Math.random() * 10)];
  return code;
};

/**
 * Demande un code OTP (One-Time Password) via Supabase Auth.
 * La géolocalisation est vérifiée ici.
 */
export const requestOtp = async (req: Request, res: Response) => {
  const { phoneNumber, countryCode } = req.body;
  const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;

  if (!phoneNumber || !countryCode) {
    return res.status(400).json({ success: false, error: 'Le numéro de téléphone et le code pays sont requis.' });
  }

  try {    
    // 1. Chercher le chat_id correspondant au numéro de téléphone
    const { data: chatData, error: chatError } = await supabase
      .from('telegram_chats')
      .select('chat_id')
      .eq('phone_number', fullPhoneNumber)
      .single();

    if (chatError || !chatData) {
      return res.status(404).json({ 
        success: false, 
        error: "Ce numéro n'est pas encore enregistré.\n\nVeuillez d'abord interagir avec notre bot sur Telegram pour lier votre compte.\n\nLien du bot : https://t.me/Belafrica_bot"
      });
    }

    // 2. Générer le code et le sauvegarder dans la table 'otps'
    const otpCode = generateOtpCode();
    const { error: otpError } = await supabase.from('otps').insert({
      phone_number: fullPhoneNumber,
      code: otpCode,
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // Expire dans 10 minutes
    });

    if (otpError) {
      console.error("Erreur de sauvegarde OTP:", otpError);
      throw new Error("Impossible de sauvegarder le code de vérification."); // Cette erreur sera attrapée par le bloc catch
    }

    // 3. Envoyer le code via Telegram
    await sendTelegramMessage(chatData.chat_id, `Votre code de vérification pour BELAFRICA est : ${otpCode}`);

    res.status(200).json({ success: true, message: "Un code de vérification a été envoyé sur votre compte Telegram." });

  } catch (error: any) {
    console.error("Erreur lors de la demande d'OTP:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur interne du serveur lors de la demande d'OTP.",
      details: error.message 
    });
  }
};

/**
 * Vérifie un code OTP et retourne une session (token JWT).
 */
export const verifyOtp = async (req: Request, res: Response) => {
  const { phoneNumber, code } = req.body;

  if (!phoneNumber || !code) {
    return res.status(400).json({ success: false, error: 'Le numéro de téléphone et le code sont requis.' });
  }

  try {
    // 1. Trouver le code dans notre table
    const { data: otpData, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .single();
      
    if (otpError || !otpData) {
      return res.status(400).json({ success: false, error: 'Code OTP invalide.' });
    }
    
    // 2. Vérifier l'expiration
    if (new Date(otpData.expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'Code OTP expiré.' });
    }

    // 3. Supprimer le code pour qu'il ne soit pas réutilisé
    await supabase.from('otps').delete().eq('id', otpData.id);
    
    // 4. ✅ Créer un token JWT temporaire pour autoriser la prochaine étape
    const tempToken = jwt.sign(
      { phoneNumber: phoneNumber }, 
      process.env.JWT_SECRET!, 
      { expiresIn: '15m' } 
    );

    res.status(200).json({ 
      success: true, 
      message: 'Code vérifié avec succès.', 
      tempToken: tempToken 
    });

  } catch (error: any) {
    console.error("Erreur lors de la vérification de l'OTP:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const completeProfile = async (req: Request, res: Response) => {
  // @ts-ignore
  const phoneNumber = req.user?.phoneNumber; 
  const { countryCode, countryName, nationality, nationalityName, community, pseudo, email, avatar } = req.body;

  if (!phoneNumber) {
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré.' });
  }

  if (!pseudo) {
    return res.status(400).json({ success: false, error: 'Le pseudo est requis.' });
  }

  try {
    // Créer l'utilisateur dans Supabase Auth et dans la table 'users'
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      phone: phoneNumber,
      phone_confirm: true, 
      email: email,
    });

    if (authError) throw authError;

    const newUser = authData.user;

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: newUser.id,
        phone_number: phoneNumber,
        country_code: countryCode,
        country_name: countryName,
        nationality: nationality,
        nationality_name: nationalityName,
        community: community,
        pseudo: pseudo,
        email: email,
        avatar_url: avatar, // L'URL de l'avatar (ex: Cloudinary) sera gérée côté client
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // ✅ Générer un token de session final et permanent pour l'utilisateur créé
    const finalToken = jwt.sign(
      { userId: newUser.id, email: newUser.email }, // Contenu du token
      process.env.JWT_SECRET!,
      { expiresIn: '30d' } // Expire dans 30 jours
    );

    res.status(201).json({ success: true, user: profileData, token: finalToken });
  } catch (error: any) {
    console.error("Erreur lors de la finalisation du profil:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};