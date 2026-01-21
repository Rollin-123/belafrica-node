"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIo = exports.initializeSocketManager = void 0;
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const socket_io_1 = require("socket.io");
const supabase_1 = require("../utils/supabase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io;
const initializeSocketManager = (httpServer, corsOptions) => {
    io = new socket_io_1.Server(httpServer, {
        cors: corsOptions
    });
    // ✅ Middleware d'authentification pour Socket.IO
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.warn('🔒 Connexion socket refusée: pas de token.');
            return next(new Error('Authentication error: no token'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const { data: user, error } = await supabase_1.supabase
                .from('users')
                .select('id, pseudo, community')
                .eq('id', decoded.userId)
                .single();
            if (error || !user) {
                console.warn(`🔒 Connexion socket refusée: utilisateur non trouvé pour l'ID ${decoded.userId}`);
                return next(new Error('Authentication error: user not found'));
            }
            socket.user = { userId: user.id, pseudo: user.pseudo, community: user.community };
            next();
        }
        catch (err) {
            return next(new Error('Authentication error: Token invalide'));
        }
    });
    io.on('connection', (socket) => {
        console.log(` Un utilisateur s'est connecté: ${socket.id} (User ID: ${socket.user?.userId})`);
        socket.on('joinConversation', async (conversationId) => {
            const { data, error } = await supabase_1.supabase
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
        socket.on('leaveConversation', (conversationId) => {
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
exports.initializeSocketManager = initializeSocketManager;
const getIo = () => {
    if (!io) {
        throw new Error('Socket.IO non initialisé ! Appelez initializeSocketManager d\'abord.');
    }
    return io;
};
exports.getIo = getIo;
//# sourceMappingURL=socket.manager.js.map