/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response } from 'express';  
import { validationResult } from 'express-validator';
import { supabase } from '../utils/supabase';
import { getIo } from '../services/socket.manager';  

/**
 * ✅ Récupère toutes les conversations de l'utilisateur authentifié.
 */
export const getConversations = async (req: Request, res: Response) => {  
  const userId = req.user?.id;  
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

    const conversationIds = participantData.map((p: { conversation_id: string }) => p.conversation_id);

    // Récupérer les détails de ces conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*, conversation_participants(user_id, users(id, pseudo, avatar_url, community))')  
      .in('id', conversationIds);

    if (conversationsError) throw conversationsError;


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
  const userId = req.user?.id;
  const { conversationId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }

  try {
    // La politique RLS de Supabase garantit que l'utilisateur a accès à cette conversation.
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, user:users(id, pseudo, avatar_url)')  
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
  const userId = req.user?.id;
  const { conversationId } = req.params;
  const { encryptedContent, iv, replyToId, mentions } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  if (!encryptedContent || !iv) {
    return res.status(400).json({ success: false, error: 'Le contenu chiffré (encryptedContent) et le vecteur d\'initialisation (iv) sont requis.' });
  }

  try {
    const messageData = {
      conversation_id: conversationId,
      sender_id: userId,  
      encrypted_content: encryptedContent,  
      iv: iv,
      reply_to_id: replyToId || null,
      mentions: mentions || null,  
    };

    // La politique RLS garantit que l'utilisateur est bien membre de la conversation.
    const { data: newMessage, error } = await supabase
      .from('messages')  
      .insert(messageData)
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url), mentions')  
      .single();

    if (error) throw error;

    // ✅ Diffuser le nouveau message à tous les clients dans la "room"
    getIo().to(conversationId).emit('newMessage', newMessage);
    console.log(`📡 Message diffusé dans la conversation ${conversationId}:`, newMessage);

    res.status(201).json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error(`Erreur lors de l'envoi du message dans ${conversationId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ✅ Modifie un message existant.
 */
export const editMessage = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { messageId } = req.params;
  const { encryptedContent, iv } = req.body;  

  if (!userId) return res.status(401).json({ success: false, error: 'Non autorisé' });
  if (!encryptedContent || !iv) return res.status(400).json({ success: false, error: 'Contenu chiffré manquant' });

  try {
    // ✅ Sécurité : Vérifier le droit de modification et le délai côté serveur
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('user_id, created_at')
      .eq('id', messageId)
      .single();

    if (fetchError || !originalMessage) {
      return res.status(404).json({ success: false, error: 'Message non trouvé.' });
    }
    if (originalMessage.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Vous n\'êtes pas autorisé à modifier ce message.' });
    }
    const EDIT_TIMEOUT = 30 * 60 * 1000;  
    if (new Date().getTime() - new Date(originalMessage.created_at).getTime() > EDIT_TIMEOUT) {
      return res.status(403).json({ success: false, error: 'Le délai de modification est dépassé.' });
    }

    const { data: updatedMessage, error } = await supabase
      .from('messages')  
      .update({ encrypted_content: encryptedContent, iv: iv, is_edited: true })  
      .eq('id', messageId)
      .eq('user_id', userId) 
      .select('*, user:users(id, pseudo, avatar_url)')
      .single();

    if (error) throw error;
    if (!updatedMessage) return res.status(404).json({ success: false, error: 'Message non trouvé ou non autorisé à modifier' });

    // ✅ Diffuser la mise à jour
    getIo().to(updatedMessage.conversation_id).emit('messageUpdated', updatedMessage);
    console.log(`📡 Message ${messageId} modifié et diffusé.`);

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ✅ Supprime un message (soft delete).
 */
export const deleteMessage = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { messageId } = req.params;

  if (!userId) return res.status(401).json({ success: false, error: 'Non autorisé' });

  try {
    // ✅ Sécurité : Vérifier le droit de suppression et le délai côté serveur
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('user_id, created_at')
      .eq('id', messageId)
      .single();

    if (fetchError || !originalMessage) {
      return res.status(404).json({ success: false, error: 'Message non trouvé.' });
    }
    if (originalMessage.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Vous n\'êtes pas autorisé à supprimer ce message.' });
    }
    const DELETE_TIMEOUT = 2 * 60 * 60 * 1000;  
    if (new Date().getTime() - new Date(originalMessage.created_at).getTime() > DELETE_TIMEOUT) {
      return res.status(403).json({ success: false, error: 'Le délai de suppression est dépassé.' });
    }

    const { data: deletedMessage, error } = await supabase
      .from('messages') 
      .update({ is_deleted: true, encrypted_content: 'Message supprimé', iv: 'deleted' })  
      .eq('id', messageId)
      .eq('user_id', userId)  
      .select('id, conversation_id')
      .single();

    if (error) throw error;
    if (!deletedMessage) return res.status(404).json({ success: false, error: 'Message non trouvé ou non autorisé à supprimer' });

    // ✅ Diffuser la suppression
    getIo().to(deletedMessage.conversation_id).emit('messageDeleted', { messageId: deletedMessage.id, conversationId: deletedMessage.conversation_id });
    console.log(`📡 Message ${messageId} supprimé et diffusé.`);

    res.status(200).json({ success: true, message: 'Message supprimé' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ✅ Marque des messages comme lus et notifie la conversation.
 */
export const markMessagesAsRead = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { conversationId } = req.params;
  const { messageIds } = req.body;  

  if (!userId) return res.status(401).json({ success: false, error: 'Non autorisé' });
  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Un tableau d\'IDs de messages est requis.' });
  }

  try {
    // Ici, on ne met pas à jour la BDD pour chaque message pour des raisons de performance.
    // On se contente de notifier les autres utilisateurs via WebSocket.
    // Une vraie implémentation pourrait stocker ces infos dans une table `read_receipts`.
    getIo().to(conversationId).emit('messagesRead', { conversationId, userId, messageIds });
    console.log(`📡 Accusé de lecture envoyé par ${userId} pour ${messageIds.length} messages dans la conv ${conversationId}`);

    res.status(200).json({ success: true, message: 'Accusé de lecture envoyé.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};