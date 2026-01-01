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
      process.env.JWT_SECRET!, // ✅ CORRECTION: Utiliser le secret JWT standard
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
  const { countryCode, countryName, nationality, nationalityName, pseudo, email, avatar } = req.body;

  if (!phoneNumber) {
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré.' });
  }

  if (!pseudo || !countryName || !nationalityName) {
    return res.status(400).json({ success: false, error: 'Le pseudo, le pays et la nationalité sont requis.' });
  }

  try {
    let authUser;

    // ÉTAPE 1 & 2: Tenter de créer l'utilisateur. S'il existe déjà, le récupérer.
    const { data: newAuthData, error: authError } = await supabase.auth.admin.createUser({
        phone: phoneNumber,
        phone_confirm: true,
        email: email, // L'email est optionnel ici, il sera mis à jour plus tard
    });

    if (authError) {
      // Si l'erreur indique que l'utilisateur existe déjà
      if (authError.message.includes('already exists')) {
        console.log('Utilisateur existant détecté, récupération des informations...');
        // On récupère l'utilisateur existant par son numéro de téléphone.
        // Note: listUsers ne filtre pas, on doit trouver le bon dans la liste.
        // C'est une opération coûteuse, mais nécessaire dans ce cas de figure.
        // Pour une app à grande échelle, une autre stratégie serait nécessaire.
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        authUser = users.find(u => u.phone === phoneNumber);

      } else {
        // Une autre erreur s'est produite lors de la création
        throw authError;
      }
    } else {
      // La création a réussi, c'est un nouvel utilisateur
      authUser = newAuthData.user;
    }

    if (!authUser) {
      throw new Error("Impossible de créer ou de trouver l'utilisateur d'authentification.");
    }

    // Le trigger `handle_new_user` a déjà (ou va) créer une ligne dans `public.users`.
    // Nous allons maintenant mettre à jour cette ligne.

    const finalCommunityName = `${nationalityName.replace(/\s/g, '')}En${countryName.replace(/\s/g, '')}`;

    // ÉTAPE 3: Mettre à jour la table `public.users`
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({
        phone_number: phoneNumber,
        country_code: countryCode,
        country_name: countryName,
        nationality: nationality,
        nationality_name: nationalityName,
        community: finalCommunityName,
        pseudo: pseudo,
        email: email, // On met à jour l'email ici aussi
        is_verified: true // L'utilisateur a complété son profil
      })
      .eq('id', authUser.id)
      .select() // On demande à Supabase de retourner la ligne mise à jour
      .single(); // Cette fois, ça DOIT fonctionner.

    if (updateError) throw updateError;

    if (!updatedProfile) {
        throw new Error("Impossible de retrouver l'utilisateur après la mise à jour.");
    }

    // ÉTAPE 4: Générer le token de session final
    const finalToken = jwt.sign(
      { userId: updatedProfile.id, email: updatedProfile.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.status(201).json({ success: true, user: updatedProfile, token: finalToken });

  } catch (error: any) {
    console.error("Erreur lors de la finalisation du profil:", error);
    const errorMessage = error.message || 'Erreur interne du serveur lors de la création du profil.';
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.details // Ajoutons les détails pour le débogage
    });
  }
};
