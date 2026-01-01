import { Router } from 'express';
import { getConversations, getMessages, sendMessage } from '../controllers/messaging.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// ✅ Récupérer toutes les conversations de l'utilisateur
router.get('/conversations', protect, getConversations);

// ✅ Récupérer les messages d'une conversation
router.get('/conversations/:conversationId/messages', protect, getMessages);

// ✅ Envoyer un message dans une conversation
router.post('/conversations/:conversationId/messages', protect, sendMessage);

export default router;

