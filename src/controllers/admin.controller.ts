// src/controllers/admin.controller.ts
/* 

    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

// ✅ Utiliser une méthode de génération de code plus simple et lisible
const generateShortCode = (length = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Génère un code d'administration.
 */
export const generateAdminCode = async (req: Request, res: Response) => {
  try {
    const {
      community,
      userEmail,
      permissions,
      expiresInHours
    } = req.body;

    if (!community || !userEmail || !permissions || !expiresInHours) {
      return res.status(400).json({ success: false, error: 'Paramètres manquants: community, userEmail, permissions, expiresInHours sont requis.' });
    }

    const code = generateShortCode();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('admin_codes')
      .insert({
        code,
        community,
        user_email: userEmail,  
        permissions,
        expires_at: expiresAt.toISOString(),
        created_by: req.user?.id, // req.user est maintenant typé
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Intégrer un service d'envoi d'email ici pour envoyer le code à `userEmail`.

    res.status(201).json({ success: true, code: data.code, message: `Code généré pour ${userEmail}.` });
  } catch (error: any) {
    console.error("Erreur lors de la génération du code admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Permet à un utilisateur de soumettre une demande pour devenir admin.
 */
export const submitAdminPromotionRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { identityImageUrl, motivation } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utilisateur non authentifié.' });
    }

    if (!identityImageUrl || !motivation) {
      return res.status(400).json({ success: false, error: 'Une image de pièce d\'identité et une motivation sont requises.' });
    }

    const { data, error } = await supabase
      .from('admin_requests')
      .insert({
        user_id: userId,
        identity_image_url: identityImageUrl,
        motivation: motivation,
        status: 'pending'  
      });

    if (error) {
      // Gérer le cas où une demande existe déjà si nécessaire (contrainte unique sur user_id)
      if (error.code === '23505') {  
        return res.status(409).json({ success: false, error: 'Vous avez déjà une demande en cours.' });
      }
      throw error;
    }

    res.status(201).json({ success: true, message: 'Votre demande a été soumise avec succès et sera examinée.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
/**
 * Valide un code et promeut un utilisateur au rang d'administrateur.
 */
export const validateAdminCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      // Cette vérification est redondante si `isAuthenticated` est utilisé, mais c'est une bonne pratique.
      return res.status(401).json({ success: false, error: 'Utilisateur non authentifié.' });
    }

    // ✅ Récupérer l'utilisateur et son code
    const { data: user, error: userError } = await supabase.from('users').select('id, community, email, is_admin, admin_permissions').eq('id', userId).single();  
    if (userError || !user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
    }

    const { data: codeData, error: codeError } = await supabase
      .from('admin_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      // ✅ On peut aussi vérifier que l'email correspond si c'est une règle métier
      // .eq('user_email', user.email) 
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !codeData) {
      return res.status(404).json({ success: false, error: 'Code invalide, expiré ou déjà utilisé.' });
    }

    // ✅ Vérifier la correspondance de la communauté pour les admins nationaux
    if (codeData.permissions.includes('post_national') && !codeData.permissions.includes('post_international')) {
      if (codeData.community !== user.community) {
        return res.status(403).json({ success: false, error: `Ce code est pour la communauté ${codeData.community}, mais vous appartenez à ${user.community}.` });
      }
    }

    // Fusionner les permissions existantes avec les nouvelles pour ne pas écraser les droits
    const existingPermissions = new Set(user.admin_permissions || []);
    codeData.permissions.forEach((p: string) => existingPermissions.add(p));
    const newPermissions = Array.from(existingPermissions);
    const newAdminLevel = newPermissions.includes('post_international') ? 'international' : 'national';

    // ✅ Mettre à jour l'utilisateur
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        is_admin: true,
        admin_permissions: newPermissions,
        admin_level: newAdminLevel
      })
      .eq('id', userId);

    if (userUpdateError) throw userUpdateError;

    // ✅ Marquer le code comme utilisé
    await supabase.from('admin_codes').update({ used: true, used_by: userId, used_at: new Date().toISOString() }).eq('id', codeData.id);

    res.json({ success: true, message: 'Félicitations, vous êtes maintenant administrateur !', permissions: newPermissions });
  } catch (error: any) {
    console.error("Erreur lors de la validation du code admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Récupère tous les codes admin actifs (non utilisés et non expirés).
 * Réservé aux super-administrateurs.
 */
export const getAdminCodes = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('admin_codes')
      .select('*')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, codes: data });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des codes admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Supprime (invalide) un code admin.
 * Réservé aux super-administrateurs.
 */
export const deleteAdminCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Le code à supprimer est manquant.' });
    }

    // On le marque comme utilisé pour l'invalider plutôt que de le supprimer
    const { error } = await supabase
      .from('admin_codes')
      .update({ used: true, expires_at: new Date().toISOString() })  
      .eq('code', code);

    if (error) throw error;

    res.status(200).json({ success: true, message: `Le code ${code} a été invalidé.` });
  } catch (error: any) {
    console.error("Erreur lors de la suppression du code admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};