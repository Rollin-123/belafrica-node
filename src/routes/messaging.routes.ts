import { Router } from 'express';
import { getConversations, getMessages, sendMessage } from '../controllers/messaging.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/conversations', protect, getConversations);

router.get('/conversations/:conversationId/messages', protect, getMessages);

router.post('/conversations/:conversationId/messages', protect, sendMessage);

export default router;

