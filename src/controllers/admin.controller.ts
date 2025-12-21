// src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { randomBytes } from 'crypto';

/**
 * Génère un code d'administration.
 * Réservé aux super-administrateurs (logique de super-admin à définir, pour l'instant on se base sur is_admin).
 */
export const generateAdminCode = async (req: Request, res: Response) => {
  try {
    const { community, permissions, expiresInHours } = req.body;

    const code = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('admin_codes')
      .insert({
        code,
        community,
        permissions,
        expires_at: expiresAt.toISOString(),
        created_by: req.user?.userId,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Valide un code et promeut un utilisateur au rang d'administrateur.
 * Accessible par un utilisateur connecté.
 */
export const validateAdminCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user?.userId;

    const { data: codeData, error: codeError } = await supabase
      .from('admin_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !codeData) {
      return res.status(404).json({ success: false, error: 'Code invalide, expiré ou déjà utilisé.' });
    }

    // Mettre à jour l'utilisateur
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        is_admin: true,
        admin_permissions: codeData.permissions,
      })
      .eq('id', userId);

    if (userUpdateError) throw userUpdateError;

    // Marquer le code comme utilisé
    await supabase.from('admin_codes').update({ used: true, used_by: userId, used_at: new Date().toISOString() }).eq('id', codeData.id);

    res.json({ success: true, message: 'Félicitations, vous êtes maintenant administrateur !' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};