// src/routes/messages.routes.ts
import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const messagesController = new MessagesController();

// Routes messages
router.get('/conversations', authMiddleware, messagesController.getConversations);
router.get('/conversations/:id/messages', authMiddleware, messagesController.getMessages);
router.post('/conversations', authMiddleware, messagesController.createConversation);
router.post('/conversations/:id/messages', authMiddleware, messagesController.sendMessage);
router.post('/group/create', authMiddleware, messagesController.createGroupChat);
router.get('/group/:communityId', authMiddleware, messagesController.getGroupChat);

export default router;
export { MessagesController };