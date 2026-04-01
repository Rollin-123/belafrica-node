/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';
import { CorsOptions } from 'cors';

let io: Server;
interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    pseudo: string;
    community: string;
  };
}

export const initializeSocketManager = (httpServer: HttpServer, corsOptions: CorsOptions) => {
  io = new Server(httpServer, {
    cors: corsOptions
  });

  // ✅ Middleware d'authentification pour Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: no token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const { data: user, error } = await supabase
        .from('users')
        .select('id, pseudo, community')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        console.warn(`🔒 Connexion socket refusée: utilisateur non trouvé pour l'ID ${decoded.userId}`);
        return next(new Error('Authentication error: user not found'));
      }

      socket.user = { userId: user.id, pseudo: user.pseudo, community: user.community };
      socket.data.userId = user.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token invalide'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(` Un utilisateur s'est connecté: ${socket.id} (User ID: ${socket.user?.userId})`);

    socket.on('joinConversation', async (conversationId: string) => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', socket.user?.userId)
        .single();

      if (error || !data) {
        console.warn(`⚠️ Tentative d'accès non autorisé à la conversation ${conversationId} par l'utilisateur ${socket.user?.userId}`);
        return;
      }

      socket.join(conversationId);
      console.log(`🚪 L'utilisateur ${socket.id} a rejoint la conversation ${conversationId}`);
    });

    socket.on('leaveConversation', (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`🚪 Le client ${socket.id} a quitté la conversation ${conversationId}`);
    });

    socket.on('startTyping', ({ conversationId }) => {
      if (socket.user) {
        socket.to(conversationId).emit('userTyping', { userId: socket.user.userId, pseudo: socket.user.pseudo, conversationId });
      }
    });

    socket.on('stopTyping', ({ conversationId }) => {
      if (socket.user) {
        socket.to(conversationId).emit('userStoppedTyping', { userId: socket.user.userId, pseudo: socket.user.pseudo, conversationId });
      }
    });

    socket.on('markAsRead', ({ conversationId, messageIds }) => {
      socket.to(conversationId).emit('messagesRead', {
        conversationId, 
        userId: socket.user?.userId,
        messageIds: messageIds
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Le client s'est déconnecté: ${socket.id}`);
    });
  });
  console.log('🚀 Socket.IO Manager initialisé.');
};

export const getIo = (): Server => {
  if (!io) {
    throw new Error('Socket.IO non initialisé ! Appelez initializeSocketManager d\'abord.');
  }
  return io;
};