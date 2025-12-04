"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseService = exports.messagesController = exports.MessagesController = void 0;
const supabase_factory_1 = require("../services/supabase.factory");
Object.defineProperty(exports, "getSupabaseService", { enumerable: true, get: function () { return supabase_factory_1.getSupabaseService; } });
const encryption_service_1 = require("../services/encryption.service");
class MessagesController {
    async getConversations(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Non autorisé' });
            }
            const supabase = (0, supabase_factory_1.getSupabaseService)();
            const conversations = await supabase.getUserConversations(userId);
            res.json({
                success: true,
                conversations,
                count: conversations.length
            });
        }
        catch (error) {
            console.error('🔥 Erreur getConversations:', error);
            res.status(500).json({
                error: 'Erreur lors de la récupération des conversations'
            });
        }
    }
    async getMessages(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { limit = 50, offset = 0 } = req.query;
            if (!userId || !id) {
                return res.status(400).json({
                    error: 'Conversation ID requis'
                });
            }
            const supabase = (0, supabase_factory_1.getSupabaseService)();
            const hasAccess = await supabase.checkConversationAccess(id, userId);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Accès non autorisé' });
            }
            const messages = await supabase.getConversationMessages(id, parseInt(limit), parseInt(offset));
            const encryptionService = (0, encryption_service_1.getEncryptionService)();
            const decryptedMessages = await Promise.all(messages.map(async (msg) => {
                if (msg.encrypted_content) {
                    try {
                        const decrypted = await encryptionService.decryptMessage(msg.encrypted_content, userId);
                        return { ...msg, content: decrypted, encrypted_content: undefined };
                    }
                    catch (error) {
                        return { ...msg, content: '🔒 Message chiffré non déchiffrable' };
                    }
                }
                return msg;
            }));
            res.json({
                success: true,
                messages: decryptedMessages,
                count: messages.length
            });
        }
        catch (error) {
            console.error('🔥 Erreur getMessages:', error);
            res.status(500).json({
                error: 'Erreur lors de la récupération des messages'
            });
        }
    }
    async sendMessage(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { content, messageType = 'text', mediaUrl, encrypt = false } = req.body;
            if (!userId || !id || !content) {
                return res.status(400).json({
                    error: 'Contenu du message requis'
                });
            }
            const supabase = (0, supabase_factory_1.getSupabaseService)();
            const hasAccess = await supabase.checkConversationAccess(id, userId);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Accès non autorisé' });
            }
            let finalContent = content;
            let encryptedContent = null;
            if (encrypt) {
                const encryptionService = (0, encryption_service_1.getEncryptionService)();
                encryptedContent = await encryptionService.encryptMessage(content, id);
                finalContent = '';
            }
            const messageData = {
                conversation_id: id,
                sender_id: userId,
                content: finalContent,
                encrypted_content: encryptedContent,
                message_type: messageType,
                media_url: mediaUrl
            };
            const message = await supabase.createMessage(messageData);
            const sender = await supabase.getUserById(userId);
            res.json({
                success: true,
                message: {
                    ...message,
                    sender: {
                        pseudo: sender?.pseudo,
                        avatar_url: sender?.avatar_url
                    }
                }
            });
        }
        catch (error) {
            console.error('🔥 Erreur sendMessage:', error);
            res.status(500).json({
                error: 'Erreur lors de l\'envoi du message'
            });
        }
    }
    async createGroupChat(req, res) {
        try {
            const userId = req.user?.id;
            const { communityId, name, description } = req.body;
            if (!userId || !communityId) {
                return res.status(400).json({
                    error: 'Communauté requise'
                });
            }
            const supabase = (0, supabase_factory_1.getSupabaseService)();
            const user = await supabase.getUserById(userId);
            if (!user || user.community !== communityId) {
                return res.status(403).json({ error: 'Vous n\'appartenez pas à cette communauté' });
            }
            const existingGroup = await supabase.getCommunityGroup(communityId);
            if (existingGroup) {
                return res.status(400).json({
                    error: 'Un groupe existe déjà pour cette communauté',
                    group: existingGroup
                });
            }
            const groupData = {
                type: 'group',
                name: name || `Groupe ${communityId}`,
                community: communityId,
                created_by: userId,
                description: description || `Groupe de discussion pour la communauté ${communityId}`
            };
            const group = await supabase.createConversation(groupData);
            await supabase.addConversationParticipant(group.id, userId, true);
            res.json({
                success: true,
                message: 'Groupe créé avec succès',
                group
            });
        }
        catch (error) {
            console.error('🔥 Erreur createGroupChat:', error);
            res.status(500).json({
                error: 'Erreur lors de la création du groupe'
            });
        }
    }
    async getGroupChat(req, res) {
        try {
            const userId = req.user?.id;
            const { communityId } = req.params;
            if (!userId || !communityId) {
                return res.status(400).json({
                    error: 'Communauté requise'
                });
            }
            const supabase = (0, supabase_factory_1.getSupabaseService)();
            const user = await supabase.getUserById(userId);
            if (!user || user.community !== communityId) {
                return res.status(403).json({ error: 'Vous n\'appartenez pas à cette communauté' });
            }
            const group = await supabase.getCommunityGroup(communityId);
            if (!group) {
                return res.status(404).json({
                    error: 'Aucun groupe trouvé pour cette communauté'
                });
            }
            const participants = await supabase.getConversationParticipants(group.id);
            res.json({
                success: true,
                group: {
                    ...group,
                    participants,
                    participantsCount: participants.length
                }
            });
        }
        catch (error) {
            console.error('🔥 Erreur getGroupChat:', error);
            res.status(500).json({
                error: 'Erreur lors de la récupération du groupe'
            });
        }
    }
    async createConversation(req, res) {
        try {
            const userId = req.user?.id;
            const { participantId } = req.body;
            if (!userId || !participantId) {
                return res.status(400).json({
                    error: 'Participant requis'
                });
            }
            if (userId === participantId) {
                return res.status(400).json({
                    error: 'Impossible de créer une conversation avec soi-même'
                });
            }
            const supabase = (0, supabase_factory_1.getSupabaseService)();
            const user1 = await supabase.getUserById(userId);
            const user2 = await supabase.getUserById(participantId);
            if (!user1 || !user2) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }
            if (user1.community !== user2.community) {
                return res.status(403).json({ error: 'Les utilisateurs ne sont pas dans la même communauté' });
            }
            const existingConversation = await supabase.getPrivateConversation(userId, participantId);
            if (existingConversation) {
                return res.json({
                    success: true,
                    message: 'Conversation déjà existante',
                    conversation: existingConversation
                });
            }
            const conversationData = {
                type: 'private',
                name: null,
                community: user1.community,
                created_by: userId
            };
            const conversation = await supabase.createConversation(conversationData);
            await supabase.addConversationParticipant(conversation.id, userId, false);
            await supabase.addConversationParticipant(conversation.id, participantId, false);
            res.json({
                success: true,
                message: 'Conversation créée avec succès',
                conversation: {
                    ...conversation,
                    participants: [
                        { id: userId, pseudo: user1.pseudo, avatar_url: user1.avatar_url },
                        { id: participantId, pseudo: user2.pseudo, avatar_url: user2.avatar_url }
                    ]
                }
            });
        }
        catch (error) {
            console.error('🔥 Erreur createConversation:', error);
            res.status(500).json({
                error: 'Erreur lors de la création de la conversation'
            });
        }
    }
}
exports.MessagesController = MessagesController;
exports.messagesController = new MessagesController();
//# sourceMappingURL=messages.controller.js.map