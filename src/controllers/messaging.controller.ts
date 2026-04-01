/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
 */
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { getIo } from '../services/socket.manager';

export const getConversations = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const userCommunity = req.user?.community;
  if (!userId || !userCommunity)
    return res.status(400).json({ success: false, error: 'Utilisateur ou communauté non identifié.' });

  try {
    let { data: groupConversation, error: groupError } = await supabase
      .from('conversations').select('id').eq('type', 'group').eq('community', userCommunity).single();
    if (groupError && groupError.code !== 'PGRST116') throw groupError;

    if (!groupConversation) {
      const { data: newGroup, error: createError } = await supabase
        .from('conversations')
        .insert({ type: 'group', name: 'Groupe ' + userCommunity, community: userCommunity, created_by: userId })
        .select('id').single();
      if (createError || !newGroup) throw new Error('Impossible de créer le groupe.');
      groupConversation = newGroup;
    }

    const { data: participant } = await supabase.from('conversation_participants').select('*')
      .eq('conversation_id', groupConversation.id).eq('user_id', userId).single();
    if (!participant)
      await supabase.from('conversation_participants').insert({ conversation_id: groupConversation.id, user_id: userId });

    const { data: participations, error: partError } = await supabase
      .from('conversation_participants').select('conversation_id').eq('user_id', userId);
    if (partError) throw partError;

    const convIds = (participations || []).map((p: any) => p.conversation_id);
    if (convIds.length === 0) return res.status(200).json({ success: true, conversations: [] });

    const { data: conversations, error: convError } = await supabase.from('conversations').select('*').in('id', convIds);
    if (convError) throw convError;

    const enriched = await Promise.all((conversations || []).map(async (conv: any) => {
      // BUG #2 FIX: 2 requêtes séparées au lieu de jointure implicite
      const { data: parts } = await supabase.from('conversation_participants')
        .select('user_id').eq('conversation_id', conv.id);
      const participantIds = (parts || []).map((p: any) => p.user_id);

      let participantsDetails: any[] = [];
      if (participantIds.length > 0) {
        const { data: usersData } = await supabase.from('users')
          .select('id, pseudo, avatar_url, community').in('id', participantIds);
        participantsDetails = (usersData || []).map((u: any) => ({
          userId: u.id, pseudo: u.pseudo || 'Membre',
          avatar: u.avatar_url || null, community: u.community || userCommunity,
          isOnline: false, lastSeen: new Date()
        }));
      }

      const { data: lastMsgArr } = await supabase.from('messages')
        .select('content, encrypted_content, created_at').eq('conversation_id', conv.id)
        .order('created_at', { ascending: false }).limit(1);
      const { count: communityCount } = await supabase.from('users')
        .select('id', { count: 'exact', head: true }).eq('community', conv.community || userCommunity);
      const lastMsg = lastMsgArr?.[0];

      return {
        ...conv, participants: participantIds, participantsDetails,
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
  const userId = (req as any).user?.id;
  const { conversationId } = req.params;
  if (!userId) return res.status(401).json({ success: false, error: 'Non autorisé' });
  try {
    const { data: messages, error } = await supabase.from('messages')
      .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url)')
      .eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (error) throw error;
    const normalized = (messages || []).map((m: any) => ({
      ...m,
      encrypted_content: m.encrypted_content || m.content || '',
      user: m.user || { id: m.sender_id, pseudo: 'Membre', avatar_url: null }
    }));
    res.status(200).json({ success: true, messages: normalized });
  } catch (error: any) {
    console.error('Erreur getMessages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { conversationId } = req.params;
  const { encryptedContent, iv, replyToId, mentions } = req.body;
  if (!userId) return res.status(401).json({ success: false, error: 'Non autorisé' });
  if (!encryptedContent) return res.status(400).json({ success: false, error: 'Le contenu est requis.' });
  try {
    const messageData: any = {
      conversation_id: conversationId, sender_id: userId,
      content: encryptedContent, encrypted_content: encryptedContent, message_type: 'text',
    };
    if (iv) messageData.iv = iv;
    if (replyToId) messageData.reply_to_id = replyToId;
    if (mentions) messageData.mentions = mentions;

    const { data: newMessage, error } = await supabase.from('messages')
      .insert(messageData).select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url)').single();
    if (error) { console.error('Erreur Supabase sendMessage:', JSON.stringify(error)); throw error; }

    const normalizedMessage = {
      ...newMessage,
      encrypted_content: newMessage.encrypted_content || newMessage.content || '',
      user: newMessage.user || { id: userId, pseudo: 'Moi', avatar_url: null }
    };

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

    // BUG #3 FIX: émettre uniquement aux autres membres (pas à l'expéditeur)
    const io = getIo();
    const sockets = await io.in(conversationId).fetchSockets();
    sockets.forEach((socket: any) => {
      if (socket.data?.userId !== userId) socket.emit('newMessage', normalizedMessage);
    });

    res.status(201).json({ success: true, message: normalizedMessage });
  } catch (error: any) {
    console.error('Erreur sendMessage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const editMessage = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { messageId } = req.params;
  const { encryptedContent } = req.body;
  if (!userId) return res.status(401).json({ success: false, error: 'Non autorisé' });
  try {
    const { data: existing } = await supabase.from('messages')
      .select('sender_id, created_at, conversation_id').eq('id', messageId).single();
    if (!existing) return res.status(404).json({ success: false, error: 'Message introuvable' });
    if (existing.sender_id !== userId) return res.status(403).json({ success: false, error: 'Non autorisé' });
    if (Date.now() - new Date(existing.created_at).getTime() > 30 * 60 * 1000)
      return res.status(400).json({ success: false, error: 'Délai de modification dépassé (30 min)' });

    const { data: updated, error } = await supabase.from('messages')
      .update({ content: encryptedContent, encrypted_content: encryptedContent, is_edited: true })
      .eq('id', messageId).select().single();
    if (error) throw error;
    getIo().to(existing.conversation_id).emit('messageEdited', updated);
    res.status(200).json({ success: true, message: updated });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
};

export const deleteMessage = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { messageId } = req.params;
  if (!userId) return res.status(401).json({ success: false, error: 'Non autorisé' });
  try {
    const { data: existing } = await supabase.from('messages')
      .select('sender_id, created_at, conversation_id').eq('id', messageId).single();
    if (!existing) return res.status(404).json({ success: false, error: 'Message introuvable' });
    if (existing.sender_id !== userId) return res.status(403).json({ success: false, error: 'Non autorisé' });
    if (Date.now() - new Date(existing.created_at).getTime() > 2 * 60 * 60 * 1000)
      return res.status(400).json({ success: false, error: 'Délai de suppression dépassé (2h)' });

    const { data: updated, error } = await supabase.from('messages')
      .update({ is_deleted: true, content: '', encrypted_content: '' }).eq('id', messageId).select().single();
    if (error) throw error;
    getIo().to(existing.conversation_id).emit('messageDeleted', { messageId, conversationId: existing.conversation_id });
    res.status(200).json({ success: true, message: updated });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
};
