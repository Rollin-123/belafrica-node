/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
 
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http'; 
import { supabase } from '../utils/supabase';  
import { getJWTService, JWTPayload } from './jwt.service'; 
import { CorsOptions } from 'cors';

let io: Server;

interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

export const initializeSocketManager = (httpServer: HttpServer, corsOptions: CorsOptions) => {  
  io = new Server(httpServer, { 
    cors: corsOptions
  });

  io.use((socket: AuthenticatedSocket, next) => {
    let token = socket.handshake.auth.token;
    if (!token && socket.request.headers.cookie) {
      const parsedCookies = Object.fromEntries(socket.request.headers.cookie.split('; ').map(c => c.split('=')));
      const accessToken = parsedCookies['access_token'];
      if (accessToken) {
        token = accessToken;
      }
    }
    if (!token) {
      return next(new Error('Authentication error: Token manquant.'));
    }
    try {
      const decoded = getJWTService().verifyToken(token);
      if (!decoded) throw new Error('Token invalide');
      socket.user = decoded;  
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token invalide'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 Un client s'est connecté: ${socket.id} (User ID: ${socket.user?.userId})`);

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
      console.log(`🚪 Le client ${socket.id} a rejoint la conversation ${conversationId}`);
    });

    socket.on('leaveConversation', (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`🚪 Le client ${socket.id} a quitté la conversation ${conversationId}`);
    });

    socket.on('startTyping', ({ conversationId }) => {
      socket.to(conversationId).emit('userTyping', { userId: socket.user?.userId, pseudo: socket.user?.pseudo, conversationId });
    });

    socket.on('stopTyping', ({ conversationId }) => {
      socket.to(conversationId).emit('userStoppedTyping', { userId: socket.user?.userId, pseudo: socket.user?.pseudo, conversationId });
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