import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';
import { sendTelegramMessage } from '../services/telegram.service';
import asyncHandler from 'express-async-handler';

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
export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, countryCode } = req.body;
  const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;

  if (!phoneNumber || !countryCode) {
    res.status(400);
    throw new Error('Le numéro de téléphone et le code pays sont requis.');
  }

    // 1. Chercher le chat_id correspondant au numéro de téléphone
    const { data: chatData, error: chatError } = await supabase
      .from('telegram_chats')
      .select('chat_id')
      .eq('phone_number', fullPhoneNumber)
      .single();

    if (chatError || !chatData) { 
        res.status(404);
        throw new Error("Ce numéro n'est pas encore enregistré.\n\nVeuillez d'abord interagir avec notre bot sur Telegram pour lier votre compte.\n\nLien du bot : https://t.me/Belafrica_bot");
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
      throw new Error("Impossible de sauvegarder le code de vérification.");
    }

    // 3. Envoyer le code via Telegram
    await sendTelegramMessage(chatData.chat_id, `Votre code de vérification pour BELAFRICA est : ${otpCode}`);

    res.status(200).json({ success: true, message: "Un code de vérification a été envoyé sur votre compte Telegram." });
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

    // 1. Vérifier le code OTP dans la table 'otps'
    const { data: otpData, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .single();

    if (otpError || !otpData) {
        res.status(401);
        throw new Error('Code OTP invalide.');
    }

    if (new Date(otpData.expires_at) < new Date()) {
        res.status(401);
        throw new Error('Code OTP expiré.');
    }

    // OTP est valide, on peut le supprimer pour qu'il ne soit pas réutilisé
    await supabase.from('otps').delete().eq('id', otpData.id);

    // 2. Vérifier si un utilisateur existe déjà dans la table 'users'
    let { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

    // Si l'utilisateur existe déjà et a un profil complet, on le connecte directement
    if (user && user.is_verified) {
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
            expiresIn: '7d',
        });
        res.json({
            success: true,
            message: 'Connexion réussie.',
            token,
            user,
        });
        return;
    }

    // Si l'utilisateur n'existe pas, on le crée en mode 'pending_profile'
    if (!user) {
        const { data: newUser, error: creationError } = await supabase
            .from('users')
            .insert({ phone_number: phoneNumber, is_verified: false })
            .select()
            .single();

        if (creationError || !newUser) {
            res.status(500);
            throw new Error('Erreur lors de la création de l\'utilisateur temporaire.');
        }
        user = newUser; // On utilise le nouvel utilisateur pour la suite
    }

    // 3. À ce stade, on a un utilisateur (existant ou nouveau) avec un statut non vérifié.
    // On génère un token temporaire pour l'étape de finalisation du profil.
    const tempToken = jwt.sign(
        { userId: user.id, temp: true }, // ✅ PAYLOAD CORRECT
        process.env.TEMP_JWT_SECRET!,    // ✅ SECRET CORRECT
        { expiresIn: '15m' }             // Durée de vie de 15 minutes pour compléter le profil
    );

    res.json({
        success: true,
        message: 'Code vérifié avec succès.',
        tempToken, // On renvoie le token temporaire
    });
});

export const completeProfile = asyncHandler(async (req: Request, res: Response) => {
  // 1. Get user ID from the protectTemp middleware
  // @ts-ignore
  const userId = req.user?.id;

  if (!userId) {
    res.status(401);
    throw new Error('Token invalide ou utilisateur non identifié.');
  }

  // 2. Get profile data from the request body
  const { countryCode, countryName, nationality, nationalityName, pseudo, email, avatar, community } = req.body;

  // 3. Validate required fields
  if (!pseudo || !countryName || !nationalityName || !community) {
    res.status(400);
    throw new Error('Le pseudo, le pays, la nationalité et la communauté sont requis.');
  }

  // 4. Update the user in the database
  const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        country_code: countryCode,
        country_name: countryName,
        nationality: nationality,
        nationality_name: nationalityName,
        community: community,
        pseudo: pseudo,
        email: email,
        avatar_url: avatar,
        is_verified: true, // Mark the user as fully verified
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

  if (updateError) {
    console.error("Erreur lors de la mise à jour du profil:", updateError);
    res.status(500);
    throw new Error('Erreur serveur lors de la finalisation du profil.');
  }

  if (!updatedUser) {
    res.status(404);
    throw new Error("Impossible de retrouver l'utilisateur après la mise à jour.");
  }

  // 5. Generate the final, permanent session token
  const finalToken = jwt.sign(
      { userId: updatedUser.id }, // Payload for the permanent token
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
  );
  
  // 6. Send the successful response
  res.status(200).json({ 
    success: true, 
    message: 'Profil créé avec succès.',
    user: updatedUser, 
    token: finalToken 
  });
});
