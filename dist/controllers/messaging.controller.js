"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markMessagesAsRead = exports.deleteMessage = exports.editMessage = exports.sendMessage = exports.getMessages = exports.getConversations = void 0;
const supabase_1 = require("../utils/supabase");
const socket_manager_1 = require("../services/socket.manager");
/**
 * ✅ Récupère toutes les conversations de l'utilisateur authentifié.
 */
const getConversations = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Non autorisé' });
    }
    try {
        // Récupérer les IDs des conversations de l'utilisateur
        const { data: participantData, error: participantError } = await supabase_1.supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId);
        if (participantError)
            throw participantError;
        if (!participantData || participantData.length === 0) {
            return res.status(200).json({ success: true, conversations: [] });
        }
        const conversationIds = participantData.map((p) => p.conversation_id);
        // Récupérer les détails de ces conversations
        const { data: conversations, error: conversationsError } = await supabase_1.supabase
            .from('conversations')
            .select('*, conversation_participants(user_id, users(id, pseudo, avatar_url, community))')
            .in('id', conversationIds);
        if (conversationsError)
            throw conversationsError;
        res.status(200).json({ success: true, conversations });
    }
    catch (error) {
        console.error("Erreur lors de la récupération des conversations:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getConversations = getConversations;
/**
 * ✅ Récupère les messages d'une conversation spécifique.
 */
const getMessages = async (req, res) => {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Non autorisé' });
    }
    try {
        // La politique RLS de Supabase garantit que l'utilisateur a accès à cette conversation.
        const { data: messages, error } = await supabase_1.supabase
            .from('messages')
            .select('*, user:users(id, pseudo, avatar_url)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        if (error)
            throw error;
        res.status(200).json({ success: true, messages });
    }
    catch (error) {
        console.error(`Erreur lors de la récupération des messages pour ${conversationId}:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMessages = getMessages;
/**
 * ✅ Envoie un message dans une conversation.
 */
const sendMessage = async (req, res) => {
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
        const { data: newMessage, error } = await supabase_1.supabase
            .from('messages') // Assurez-vous que c'est la bonne table
            .insert(messageData)
            .select('*, user:users!messages_sender_id_fkey(id, pseudo, avatar_url), mentions') // ✅ CORRECTION: Utiliser la bonne relation
            .single();
        if (error)
            throw error;
        // ✅ Diffuser le nouveau message à tous les clients dans la "room"
        (0, socket_manager_1.getIo)().to(conversationId).emit('newMessage', newMessage);
        console.log(`📡 Message diffusé dans la conversation ${conversationId}:`, newMessage);
        res.status(201).json({ success: true, message: newMessage });
    }
    catch (error) {
        console.error(`Erreur lors de l'envoi du message dans ${conversationId}:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.sendMessage = sendMessage;
/**
 * ✅ Modifie un message existant.
 */
const editMessage = async (req, res) => {
    const userId = req.user?.id;
    const { messageId } = req.params;
    const { encryptedContent, iv } = req.body;
    if (!userId)
        return res.status(401).json({ success: false, error: 'Non autorisé' });
    if (!encryptedContent || !iv)
        return res.status(400).json({ success: false, error: 'Contenu chiffré manquant' });
    try {
        // ✅ Sécurité : Vérifier le droit de modification et le délai côté serveur
        const { data: originalMessage, error: fetchError } = await supabase_1.supabase
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
        const { data: updatedMessage, error } = await supabase_1.supabase
            .from('messages') // Assurez-vous que c'est la bonne table
            .update({ encrypted_content: encryptedContent, iv: iv, is_edited: true }) // updated_at est géré par le trigger
            .eq('id', messageId)
            .eq('user_id', userId)
            .select('*, user:users(id, pseudo, avatar_url)')
            .single();
        if (error)
            throw error;
        if (!updatedMessage)
            return res.status(404).json({ success: false, error: 'Message non trouvé ou non autorisé à modifier' });
        // ✅ Diffuser la mise à jour
        (0, socket_manager_1.getIo)().to(updatedMessage.conversation_id).emit('messageUpdated', updatedMessage);
        console.log(`📡 Message ${messageId} modifié et diffusé.`);
        res.status(200).json({ success: true, message: updatedMessage });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.editMessage = editMessage;
/**
 * ✅ Supprime un message (soft delete).
 */
const deleteMessage = async (req, res) => {
    const userId = req.user?.id;
    const { messageId } = req.params;
    if (!userId)
        return res.status(401).json({ success: false, error: 'Non autorisé' });
    try {
        // ✅ Sécurité : Vérifier le droit de suppression et le délai côté serveur
        const { data: originalMessage, error: fetchError } = await supabase_1.supabase
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
        const { data: deletedMessage, error } = await supabase_1.supabase
            .from('messages') // Assurez-vous que c'est la bonne table
            .update({ is_deleted: true, encrypted_content: 'Message supprimé', iv: 'deleted' }) // Mettre des placeholders pour respecter NOT NULL
            .eq('id', messageId)
            .eq('user_id', userId)
            .select('id, conversation_id')
            .single();
        if (error)
            throw error;
        if (!deletedMessage)
            return res.status(404).json({ success: false, error: 'Message non trouvé ou non autorisé à supprimer' });
        // ✅ Diffuser la suppression
        (0, socket_manager_1.getIo)().to(deletedMessage.conversation_id).emit('messageDeleted', { messageId: deletedMessage.id, conversationId: deletedMessage.conversation_id });
        console.log(`📡 Message ${messageId} supprimé et diffusé.`);
        res.status(200).json({ success: true, message: 'Message supprimé' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.deleteMessage = deleteMessage;
/**
 * ✅ Marque des messages comme lus et notifie la conversation.
 */
const markMessagesAsRead = async (req, res) => {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { messageIds } = req.body;
    if (!userId)
        return res.status(401).json({ success: false, error: 'Non autorisé' });
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Un tableau d\'IDs de messages est requis.' });
    }
    try {
        // Ici, on ne met pas à jour la BDD pour chaque message pour des raisons de performance.
        // On se contente de notifier les autres utilisateurs via WebSocket.
        // Une vraie implémentation pourrait stocker ces infos dans une table `read_receipts`.
        (0, socket_manager_1.getIo)().to(conversationId).emit('messagesRead', { conversationId, userId, messageIds });
        console.log(`📡 Accusé de lecture envoyé par ${userId} pour ${messageIds.length} messages dans la conv ${conversationId}`);
        res.status(200).json({ success: true, message: 'Accusé de lecture envoyé.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.markMessagesAsRead = markMessagesAsRead;
//# sourceMappingURL=messaging.controller.js.map