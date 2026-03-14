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
export const getConversations = async (req: any, res: Response) => {  
  const userId = req.user?.id;
  const userCommunity = req.user?.community;

  if (!userId || !userCommunity) {
    return res.status(400).json({ success: false, error: "Utilisateur ou communauté non identifié." });
  }
  
  try {
    // --- Étape 1: S'assurer que la conversation de groupe pour la communauté de l'utilisateur existe ---
    let { data: groupConversation, error: groupError } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'group')
      .eq('community', userCommunity)
      .single();
    
    if (groupError && groupError.code !== 'PGRST116') { // PGRST116 = no rows found, ce qui est normal
      throw groupError;
    }

    // --- Étape 2: Si elle n'existe pas, la créer ---
    if (!groupConversation) {
      console.log(`🔧 La conversation de groupe pour "${userCommunity}" n'existe pas. Création...`);
      const { data: newGroup, error: createError } = await supabase
        .from('conversations')
        .insert({ type: 'group', name: `Groupe ${userCommunity}`, community: userCommunity, created_by: userId })
        .select('id')
        .single();
      
      if (createError || !newGroup) {
        console.error("❌ Erreur lors de la création de la conversation de groupe:", createError);
        throw new Error("Impossible de créer la conversation de groupe.");
      }
      groupConversation = newGroup;
      console.log(`✅ Conversation de groupe créée avec l'ID: ${groupConversation.id}`);
    }

    // --- Étape 3: S'assurer que l'utilisateur est bien membre de cette conversation de groupe ---
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', groupConversation.id!)  
      .eq('user_id', userId)
      .single();

    if (participantError && participantError.code !== 'PGRST116') {
      throw participantError;
    }

    if (!participant) {
      console.log(`➕ Ajout de l'utilisateur ${userId} à la conversation de groupe ${groupConversation.id!}`);
      const { error: joinError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: groupConversation.id!, user_id: userId });

      if (joinError) console.error("❌ Erreur lors de l'ajout de l'utilisateur à la conversation:", joinError);
    }

    // --- Étape 4: Récupérer toutes les conversations de l'utilisateur (y compris la nouvelle) ---
    const { data: allUserConversations, error: fetchError } = await supabase.rpc('get_user_conversations_with_details', { p_user_id: userId });
    if (fetchError) throw fetchError;

    // Le front-end s'attend à `participantsDetails`, mais notre RPC renvoie `participants`. On mappe ici pour la compatibilité.
    const formattedConversations = (allUserConversations || []).map((conv: any) => ({
      ...conv,
      participantsDetails: conv.participants || [],
    }));

    res.status(200).json({ success: true, conversations: formattedConversations });
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
      .from('messages') // Assurez-vous que c'est la bonne table
      .insert(messageData)
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url), mentions') // ✅ CORRECTION: Utiliser la bonne relation
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
      .from('messages') // Assurez-vous que c'est la bonne table
      .update({ encrypted_content: encryptedContent, iv: iv, is_edited: true }) // updated_at est géré par le trigger
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
      .from('messages') // Assurez-vous que c'est la bonne table
      .update({ is_deleted: true, encrypted_content: 'Message supprimé', iv: 'deleted' }) // Mettre des placeholders pour respecter NOT NULL
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