/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
 */
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { getIo } from '../server';

export const getConversations = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const userCommunity = req.user?.community;

  if (!userId || !userCommunity) {
    return res.status(400).json({ success: false, error: 'Utilisateur ou communaute non identifie.' });
  }

  try {
    // S'assurer que le groupe de la communauté existe
    let { data: groupConversation, error: groupError } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'group')
      .eq('community', userCommunity)
      .single();

    if (groupError && groupError.code !== 'PGRST116') throw groupError;

    if (!groupConversation) {
      const { data: newGroup, error: createError } = await supabase
        .from('conversations')
        .insert({ type: 'group', name: 'Groupe ' + userCommunity, community: userCommunity, created_by: userId })
        .select('id')
        .single();
      if (createError || !newGroup) throw new Error('Impossible de creer le groupe.');
      groupConversation = newGroup;
    }

    // S'assurer que l'utilisateur est membre
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', groupConversation.id)
      .eq('user_id', userId)
      .single();

    if (participantError && participantError.code !== 'PGRST116') throw participantError;

    if (!participant) {
      await supabase.from('conversation_participants')
        .insert({ conversation_id: groupConversation.id, user_id: userId });
    }

    // Récupérer toutes les conversations de l'utilisateur
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    if (partError) throw partError;

    const convIds = (participations || []).map((p: any) => p.conversation_id);
    if (convIds.length === 0) return res.status(200).json({ success: true, conversations: [] });

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds);
    if (convError) throw convError;

    const enriched = await Promise.all((conversations || []).map(async (conv: any) => {
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, users(id, pseudo, avatar_url, community)')
        .eq('conversation_id', conv.id);

      const { data: lastMsgArr } = await supabase
        .from('messages')
        .select('content, encrypted_content, created_at')
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

      const { count: communityCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('community', conv.community || userCommunity);

      const lastMsg = lastMsgArr?.[0];
      return {
        ...conv,
        participants: (parts || []).map((p: any) => p.user_id),
        participantsDetails,
        communityMembersCount: communityCount || participantsDetails.length,
        unreadCount: 0,
        lastMessage: lastMsg?.encrypted_content || lastMsg?.content || '',
        lastMessageTimestamp: lastMsg?.created_at || conv.created_at,
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
  if (!userId) return res.status(401).json({ success: false, error: 'Non autorise' });

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const normalized = (messages || []).map((m: any) => ({
      ...m,
      encrypted_content: m.encrypted_content || m.content || '',
    }));

    res.status(200).json({ success: true, messages: normalized });
  } catch (error: any) {
    console.error('Erreur getMessages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { conversationId } = req.params;
  const { encryptedContent, iv, replyToId, mentions } = req.body;

  if (!userId) return res.status(401).json({ success: false, error: 'Non autorise' });
  if (!encryptedContent) return res.status(400).json({ success: false, error: 'Le contenu est requis.' });

  try {
    const messageData: any = {
      conversation_id: conversationId,
      sender_id: userId,
      content: encryptedContent,           // colonne principale
      encrypted_content: encryptedContent, // alias chiffrement
      message_type: 'text',
    };
    if (iv) messageData.iv = iv;

    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url)')
      .single();

    if (error) {
      console.error('Erreur Supabase sendMessage:', JSON.stringify(error));
      throw error;
    }

    const normalizedMessage = {
      ...newMessage,
      encrypted_content: newMessage.encrypted_content || newMessage.content || '',
    };

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    getIo().to(conversationId).emit('newMessage', normalizedMessage);
    console.log('✅ Message envoyé dans ' + conversationId);

    res.status(201).json({ success: true, message: normalizedMessage });
  } catch (error: any) {
    console.error('Erreur sendMessage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const editMessage = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { messageId } = req.params;
  const { encryptedContent } = req.body;
  if (!userId) return res.status(401).json({ success: false, error: 'Non autorise' });
  if (!encryptedContent) return res.status(400).json({ success: false, error: 'Contenu requis' });

  try {
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, created_at, conversation_id')
      .eq('id', messageId)
      .single();
    if (fetchError || !originalMessage) return res.status(404).json({ success: false, error: 'Message non trouvé.' });
    if (originalMessage.sender_id !== userId) return res.status(403).json({ success: false, error: 'Non autorisé.' });

    if (new Date().getTime() - new Date(originalMessage.created_at).getTime() > 30 * 60 * 1000) {
      return res.status(403).json({ success: false, error: 'Délai de modification dépassé (30 min).' });
    }

    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({ content: encryptedContent, encrypted_content: encryptedContent })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url)')
      .single();
    if (error) throw error;

    getIo().to(originalMessage.conversation_id).emit('messageUpdated', updatedMessage);
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
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, conversation_id')
      .eq('id', messageId)
      .single();
    if (fetchError || !message) return res.status(404).json({ success: false, error: 'Message non trouvé.' });

    const { data: reqUser } = await supabase.from('users').select('is_admin').eq('id', userId).single();
    if (message.sender_id !== userId && !reqUser?.is_admin) {
      return res.status(403).json({ success: false, error: 'Non autorisé.' });
    }

    await supabase.from('messages')
      .update({ content: '[Message supprimé]', encrypted_content: '[Message supprimé]' })
      .eq('id', messageId);

    getIo().to(message.conversation_id).emit('messageDeleted', { messageId, conversationId: message.conversation_id });
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markMessagesAsRead = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { conversationId } = req.params;
  const { messageIds } = req.body;
  if (!userId) return res.status(401).json({ success: false, error: 'Non autorise' });

  try {
    if (messageIds && messageIds.length > 0) {
      await supabase.from('messages')
        .update({ is_read: true })
        .in('id', messageIds)
        .eq('conversation_id', conversationId);
    }
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
