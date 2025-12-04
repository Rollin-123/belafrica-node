// src/controllers/messages.controller.ts
import { Request, Response } from 'express';
import { getSupabaseService } from '../services/supabase.factory';
import { getEncryptionService } from '../services/encryption.service';

export class MessagesController {
  // ✅ RÉCUPÉRER les conversations
  async getConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Non autorisé' });
      }

      const supabase = getSupabaseService();
      const conversations = await supabase.getUserConversations(userId);

      res.json({
        success: true,
        conversations,
        count: conversations.length
      });

    } catch (error: any) {
      console.error('🔥 Erreur getConversations:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des conversations'
      });
    }
  }

  // ✅ RÉCUPÉRER les messages d'une conversation
  async getMessages(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!userId || !id) {
        return res.status(400).json({
          error: 'Conversation ID requis'
        });
      }

      const supabase = getSupabaseService();
      
      // Vérifier que l'utilisateur a accès à la conversation
      const hasAccess = await supabase.checkConversationAccess(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const messages = await supabase.getConversationMessages(
        id,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      // Déchiffrer les messages si nécessaire
      const encryptionService = getEncryptionService();
      const decryptedMessages = await Promise.all(
        messages.map(async (msg: any) => {
          if (msg.encrypted_content) {
            try {
              const decrypted = await encryptionService.decryptMessage(
                msg.encrypted_content,
                userId
              );
              return { ...msg, content: decrypted, encrypted_content: undefined };
            } catch (error) {
              return { ...msg, content: '🔒 Message chiffré non déchiffrable' };
            }
          }
          return msg;
        })
      );

      res.json({
        success: true,
        messages: decryptedMessages,
        count: messages.length
      });

    } catch (error: any) {
      console.error('🔥 Erreur getMessages:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des messages'
      });
    }
  }

  // ✅ ENVOYER un message
  async sendMessage(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { content, messageType = 'text', mediaUrl, encrypt = false } = req.body;

      if (!userId || !id || !content) {
        return res.status(400).json({
          error: 'Contenu du message requis'
        });
      }

      const supabase = getSupabaseService();
      
      // Vérifier que l'utilisateur a accès à la conversation
      const hasAccess = await supabase.checkConversationAccess(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      let finalContent = content;
      let encryptedContent = null;

      // Chiffrer le message si demandé
      if (encrypt) {
        const encryptionService = getEncryptionService();
        encryptedContent = await encryptionService.encryptMessage(content, id);
        finalContent = ''; // Le contenu original est vide, seul le chiffré est stocké
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

      // Récupérer les informations de l'expéditeur
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

    } catch (error: any) {
      console.error('🔥 Erreur sendMessage:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'envoi du message'
      });
    }
  }

  // ✅ CRÉER un groupe de chat
  async createGroupChat(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { communityId, name, description } = req.body;

      if (!userId || !communityId) {
        return res.status(400).json({
          error: 'Communauté requise'
        });
      }

      const supabase = getSupabaseService();
      
      // Vérifier que l'utilisateur appartient à la communauté
      const user = await supabase.getUserById(userId);
      if (!user || user.community !== communityId) {
        return res.status(403).json({ error: 'Vous n\'appartenez pas à cette communauté' });
      }

      // Vérifier si un groupe existe déjà pour cette communauté
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
      
      // Ajouter l'utilisateur comme participant et admin
      await supabase.addConversationParticipant(group.id, userId, true);

      res.json({
        success: true,
        message: 'Groupe créé avec succès',
        group
      });

    } catch (error: any) {
      console.error('🔥 Erreur createGroupChat:', error);
      res.status(500).json({
        error: 'Erreur lors de la création du groupe'
      });
    }
  }

  // ✅ RÉCUPÉRER le groupe d'une communauté
  async getGroupChat(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { communityId } = req.params;

      if (!userId || !communityId) {
        return res.status(400).json({
          error: 'Communauté requise'
        });
      }

      const supabase = getSupabaseService();
      
      // Vérifier que l'utilisateur appartient à la communauté
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

      // Récupérer les participants
      const participants = await supabase.getConversationParticipants(group.id);

      res.json({
        success: true,
        group: {
          ...group,
          participants,
          participantsCount: participants.length
        }
      });

    } catch (error: any) {
      console.error('🔥 Erreur getGroupChat:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du groupe'
      });
    }
  }

  // ✅ CRÉER une conversation privée
  async createConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
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

      const supabase = getSupabaseService();
      
      // Vérifier que les deux utilisateurs existent et sont dans la même communauté
      const user1 = await supabase.getUserById(userId);
      const user2 = await supabase.getUserById(participantId);
      
      if (!user1 || !user2) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      if (user1.community !== user2.community) {
        return res.status(403).json({ error: 'Les utilisateurs ne sont pas dans la même communauté' });
      }

      // Vérifier si une conversation existe déjà
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
        name: null, // Les conversations privées n'ont pas de nom
        community: user1.community,
        created_by: userId
      };

      const conversation = await supabase.createConversation(conversationData);
      
      // Ajouter les deux participants
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

    } catch (error: any) {
      console.error('🔥 Erreur createConversation:', error);
      res.status(500).json({
        error: 'Erreur lors de la création de la conversation'
      });
    }
  }
}

export const messagesController = new MessagesController();

export { getSupabaseService };