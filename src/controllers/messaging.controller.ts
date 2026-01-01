import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

/**
 * ✅ Récupère toutes les conversations de l'utilisateur authentifié.
 */
export const getConversations = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user?.id; // ✅ CORRECTION: Le middleware 'protect' attache l'utilisateur complet
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }

  try {
    // Récupérer les IDs des conversations de l'utilisateur
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (participantError) throw participantError;

    if (!participantData || participantData.length === 0) {
      return res.status(200).json({ success: true, conversations: [] });
    }

    const conversationIds = participantData.map(p => p.conversation_id);

    // Récupérer les détails de ces conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*, conversation_participants(user_id, users(id, pseudo, avatar_url))') // Enrichir avec les participants
      .in('id', conversationIds);

    if (conversationsError) throw conversationsError;

    // TODO: Enrichir les conversations avec les détails des participants, le dernier message, etc.

    res.status(200).json({ success: true, conversations });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des conversations:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ✅ Récupère les messages d'une conversation spécifique.
 */
export const getMessages = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user?.id;
  const { conversationId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }

  try {
    // La politique RLS de Supabase garantit que l'utilisateur a accès à cette conversation.
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, user:users(id, pseudo, avatar_url)') // Enrichir avec l'auteur du message
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, messages });
  } catch (error: any) {
    console.error(`Erreur lors de la récupération des messages pour ${conversationId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ✅ Envoie un message dans une conversation.
 */
export const sendMessage = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user?.id;
  const { conversationId } = req.params;
  const { encryptedContent, iv, replyToId } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }

  if (!encryptedContent || !iv) {
    return res.status(400).json({ success: false, error: 'Le contenu chiffré (encryptedContent) et le vecteur d\'initialisation (iv) sont requis.' });
  }

  try {
    const messageData = {
      conversation_id: conversationId,
      user_id: userId,
      encrypted_content: encryptedContent,
      iv: iv,
      reply_to_id: replyToId || null,
    };

    // La politique RLS garantit que l'utilisateur est bien membre de la conversation.
    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error(`Erreur lors de l'envoi du message dans ${conversationId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};