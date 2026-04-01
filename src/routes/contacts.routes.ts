/*
 * BELAFRICA - Routes contacts (sync téléphone + blocage)
 * FIX: chemin middleware corrigé: '../middleware/auth.middleware' (sans 's')
 * FIX: export correct: { protect } (pas authenticateToken)
 */
import { Router, Response } from 'express';
import { supabase } from '../utils/supabase';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

/**
 * POST /api/contacts/sync
 * Reçoit des numéros de téléphone, retourne les membres BelAfrica correspondants.
 * Les numéros ne sont JAMAIS stockés côté serveur.
 */
router.post('/sync', async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { phoneNumbers } = req.body;

  if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0)
    return res.status(400).json({ success: false, error: 'phoneNumbers requis' });

  try {
    const normalized = phoneNumbers.map((n: string) =>
      n.replace(/\s+/g, '').replace(/[^\d+]/g, '')
    );

    // Exclure les contacts bloqués
    const { data: blocks } = await supabase
      .from('user_blocks').select('blocked_user_id').eq('user_id', userId);
    const blockedIds = (blocks || []).map((b: any) => b.blocked_user_id);

    const { data: matchedUsers, error } = await supabase
      .from('users')
      .select('id, pseudo, avatar_url, phone_number, community')
      .in('phone_number', normalized)
      .neq('id', userId);

    if (error) throw error;

    const contacts = (matchedUsers || [])
      .filter((u: any) => !blockedIds.includes(u.id))
      .map((u: any) => ({
        userId: u.id,
        pseudo: u.pseudo || 'Membre',
        avatarUrl: u.avatar_url || null,
        phoneNumber: u.phone_number,
        community: u.community
      }));

    res.status(200).json({ success: true, contacts });
  } catch (error: any) {
    console.error('Erreur sync contacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/contacts/blocked
 */
router.get('/blocked', async (req: any, res: Response) => {
  const userId = req.user?.id;
  try {
    const { data: blocks } = await supabase
      .from('user_blocks').select('blocked_user_id').eq('user_id', userId);
    const blockedIds = (blocks || []).map((b: any) => b.blocked_user_id);
    if (blockedIds.length === 0) return res.status(200).json({ success: true, contacts: [] });

    const { data: users } = await supabase
      .from('users').select('id, pseudo, avatar_url').in('id', blockedIds);
    const contacts = (users || []).map((u: any) => ({
      id: u.id, pseudo: u.pseudo, avatar: u.avatar_url
    }));
    res.status(200).json({ success: true, contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/contacts/block/:contactId
 */
router.delete('/block/:contactId', async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { contactId } = req.params;
  try {
    await supabase.from('user_blocks')
      .delete().eq('user_id', userId).eq('blocked_user_id', contactId);
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
