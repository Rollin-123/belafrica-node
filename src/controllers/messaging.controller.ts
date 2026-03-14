/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { supabase } from '../utils/supabase';
import { getIo } from '../services/socket.manager';

export const getConversations = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const userCommunity = req.user?.community;

  if (!userId || !userCommunity) {
    return res.status(400).json({ success: false, error: 'Utilisateur ou communaute non identifie.' });
  }

  try {
    // Etape 1: S'assurer que la conversation de groupe de la communaute existe
    let { data: groupConversation, error: groupError } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'group')
      .eq('community', userCommunity)
      .single();

    if (groupError && groupError.code !== 'PGRST116') {
      throw groupError;
    }

    // Etape 2: Si elle n'existe pas, la creer
    if (!groupConversation) {
      console.log('La conversation de groupe pour ' + userCommunity + ' n existe pas. Creation...');
      const { data: newGroup, error: createError } = await supabase
        .from('conversations')
        .insert({ type: 'group', name: 'Groupe ' + userCommunity, community: userCommunity, created_by: userId })
        .select('id')
        .single();

      if (createError || !newGroup) {
        throw new Error('Impossible de creer la conversation de groupe.');
      }
      groupConversation = newGroup;
      console.log('Conversation de groupe creee avec ID: ' + groupConversation.id);
    }

    // Etape 3: S'assurer que l'utilisateur est membre de ce groupe
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', groupConversation.id)
      .eq('user_id', userId)
      .single();

    if (participantError && participantError.code !== 'PGRST116') {
      throw participantError;
    }

    if (!participant) {
      console.log('Ajout de ' + userId + ' a la conversation ' + groupConversation.id);
      const { error: joinError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: groupConversation.id, user_id: userId });

      if (joinError) console.error('Erreur ajout participant:', joinError);
    }

    // Etape 4: Recuperer les conversations via une requete directe (sans RPC cassee)
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (partError) throw partError;

    const convIds = (participations || []).map((p: any) => p.conversation_id);

    if (convIds.length === 0) {
      return res.status(200).json({ success: true, conversations: [] });
    }

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds);

    if (convError) throw convError;

    // Etape 5: Pour chaque conversation, recuperer les participants et le dernier message
    const enriched = await Promise.all((conversations || []).map(async (conv: any) => {
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, users(id, pseudo, avatar_url, community)')
        .eq('conversation_id', conv.id);

      const { data: lastMsgArr } = await supabase
        .from('messages')
        .select('encrypted_content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const participantsDetails = (parts || []).map((p: any) => ({
        userId: p.user_id,
        pseudo: p.users?.pseudo || 'Inconnu',
        avatar: p.users?.avatar_url,
        community: p.users?.community,
        isOnline: false,
        lastSeen: new Date()
      }));

      // Compteur communaute: nombre d'utilisateurs dans la meme communaute
      const { count: communityCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('community', conv.community || userCommunity);

      return {
        ...conv,
        participants: (parts || []).map((p: any) => p.user_id),
        participantsDetails,
        communityMembersCount: communityCount || participantsDetails.length,
        unreadCount: 0,
        lastMessage: lastMsgArr?.[0]?.encrypted_content || '',
        lastMessageTimestamp: lastMsgArr?.[0]?.created_at || conv.created_at,
        adminIds: []
      };
    }));

    res.status(200).json({ success: true, conversations: enriched });
  } catch (error: any) {
    console.error('Erreur getConversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { conversationId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Non autorise' });
  }

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, messages });
  } catch (error: any) {
    console.error('Erreur getMessages pour ' + conversationId + ':', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { conversationId } = req.params;
  const { encryptedContent, iv, replyToId, mentions } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Non autorise' });
  }

  if (!encryptedContent || !iv) {
    return res.status(400).json({ success: false, error: 'encryptedContent et iv sont requis.' });
  }

  try {
    const messageData: any = {
      conversation_id: conversationId,
      sender_id: userId,
      encrypted_content: encryptedContent,
      iv: iv,
    };

    if (replyToId) messageData.reply_to_id = replyToId;
    if (mentions && mentions.length > 0) messageData.mentions = mentions;

    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url)')
      .single();

    if (error) throw error;

    // Mettre a jour updated_at de la conversation
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Diffuser le message via Socket.IO
    getIo().to(conversationId).emit('newMessage', newMessage);
    console.log('Message diffuse dans ' + conversationId);

    res.status(201).json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('Erreur sendMessage dans ' + conversationId + ':', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const editMessage = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { messageId } = req.params;
  const { encryptedContent, iv } = req.body;

  if (!userId) return res.status(401).json({ success: false, error: 'Non autorise' });
  if (!encryptedContent || !iv) return res.status(400).json({ success: false, error: 'Contenu chiffre manquant' });

  try {
    // Verification: sender_id (pas user_id)
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, created_at, conversation_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !originalMessage) {
      return res.status(404).json({ success: false, error: 'Message non trouve.' });
    }
    if (originalMessage.sender_id !== userId) {
      return res.status(403).json({ success: false, error: 'Vous n etes pas autorise a modifier ce message.' });
    }

    const EDIT_TIMEOUT = 30 * 60 * 1000;
    if (new Date().getTime() - new Date(originalMessage.created_at).getTime() > EDIT_TIMEOUT) {
      return res.status(403).json({ success: false, error: 'Le delai de modification est depasse (30 min).' });
    }

    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({ encrypted_content: encryptedContent, iv: iv, is_edited: true })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url)')
      .single();

    if (error) throw error;
    if (!updatedMessage) return res.status(404).json({ success: false, error: 'Message non trouve ou non autorise' });

    getIo().to(originalMessage.conversation_id).emit('messageUpdated', updatedMessage);
    console.log('Message ' + messageId + ' modifie et diffuse.');

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { messageId } = req.params;

  if (!userId) return res.status(401).json({ success: false, error: 'Non autorise' });

  try {
    // Verification: sender_id (pas user_id)
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, created_at, conversation_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !originalMessage) {
      return res.status(404).json({ success: false, error: 'Message non trouve.' });
    }
    if (originalMessage.sender_id !== userId) {
      return res.status(403).json({ success: false, error: 'Vous n etes pas autorise a supprimer ce message.' });
    }

    const DELETE_TIMEOUT = 2 * 60 * 60 * 1000;
    if (new Date().getTime() - new Date(originalMessage.created_at).getTime() > DELETE_TIMEOUT) {
      return res.status(403).json({ success: false, error: 'Le delai de suppression est depasse (2h).' });
    }

    const { data: deletedMessage, error } = await supabase
      .from('messages')
      .update({ is_deleted: true, encrypted_content: 'Message supprime', iv: 'deleted' })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select('id, conversation_id')
      .single();

    if (error) throw error;
    if (!deletedMessage) return res.status(404).json({ success: false, error: 'Message non trouve ou non autorise' });

    getIo().to(deletedMessage.conversation_id).emit('messageDeleted', {
      messageId: deletedMessage.id,
      conversationId: deletedMessage.conversation_id
    });
    console.log('Message ' + messageId + ' supprime et diffuse.');

    res.status(200).json({ success: true, message: 'Message supprime' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markMessagesAsRead = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { conversationId } = req.params;
  const { messageIds } = req.body;

  if (!userId) return res.status(401).json({ success: false, error: 'Non autorise' });
  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Un tableau d IDs de messages est requis.' });
  }

  try {
    getIo().to(conversationId).emit('messagesRead', { conversationId, userId, messageIds });
    res.status(200).json({ success: true, message: 'Accuse de lecture envoye.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
