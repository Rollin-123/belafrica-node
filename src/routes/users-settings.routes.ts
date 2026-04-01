/*
 * BELAFRICA - Routes settings utilisateur (privacy, sessions)
 * FIX: chemin '../middleware/auth.middleware' (sans 's')
 * FIX: export { protect } (pas authenticateToken)
 */
import { Router, Response } from 'express';
import { supabase } from '../utils/supabase';
import { protect } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(protect);

/**
 * GET /api/users/settings
 */
router.get('/settings', async (req: any, res: Response) => {
  const userId = req.user?.id;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('privacy_last_seen, privacy_read_receipts')
      .eq('id', userId)
      .single();
    if (error) throw error;
    res.status(200).json({
      privacy_last_seen: user?.privacy_last_seen || 'everyone',
      privacy_read_receipts: user?.privacy_read_receipts !== false
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/privacy-settings
 */
router.put('/privacy-settings', async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { privacy_last_seen, privacy_read_receipts } = req.body;
  try {
    const updateData: any = {};
    if (privacy_last_seen !== undefined) updateData.privacy_last_seen = privacy_last_seen;
    if (privacy_read_receipts !== undefined) updateData.privacy_read_receipts = privacy_read_receipts;
    const { error } = await supabase.from('users').update(updateData).eq('id', userId);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/sessions
 */
router.get('/sessions', async (req: any, res: Response) => {
  const userId = req.user?.id;
  try {
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('id, device, ip, created_at, token_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const currentToken = req.headers.authorization?.split(' ')[1];
    const currentHash = currentToken ? simpleHash(currentToken) : '';

    const result = (sessions || []).map((s: any) => ({
      id: s.id,
      device: s.device || 'Appareil inconnu',
      ip: s.ip || 'IP inconnue',
      createdAt: s.created_at,
      isCurrent: s.token_hash === currentHash
    }));
    res.status(200).json({ success: true, sessions: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { sessionId } = req.params;
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export default router;
