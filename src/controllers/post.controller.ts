// src/controllers/post.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

// ✅ RÈGLE : Seuls les administrateurs peuvent créer un post.
export const createPost = async (req: Request, res: Response) => {
  try {
    const { content, visibility } = req.body;
    const authorId = req.user?.userId;

    // Définir la date d'expiration selon la documentation
    const expirationHours = visibility === 'national' ? 48 : 72;
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        content,
        visibility,
        expires_at: expiresAt.toISOString(),
        author_id: authorId,
        community: req.user?.community,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Tout utilisateur connecté peut lire les posts
export const getPosts = async (req: Request, res: Response) => {
  try {
    // ✅ FILTRAGE : On ne récupère que les posts non expirés.
    const { data, error } = await supabase
      .from('posts')
      .select(`
      *,
      author:users ( pseudo, avatar_url )
    `).gt('expires_at', new Date().toISOString());

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ RÈGLE : Seul un administrateur peut supprimer un post.
export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Vérifier que le post existe avant de le supprimer.
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ success: false, error: 'Post non trouvé' });
    }

    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Post supprimé' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};