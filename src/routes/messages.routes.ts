import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const messagesController = new MessagesController();

router.post('/send', authMiddleware, (req, res) => {
  messagesController.sendMessage(req, res);
});

router.get('/conversations', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir',
    conversations: []
  });
});

router.get('/conversations/:id/messages', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir',
    conversationId: req.params.id,
    messages: []
  });
});

router.post('/conversations', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir'
  });
});

router.post('/group/create', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir'
  });
});

router.get('/group/:communityId', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir',
    communityId: req.params.communityId,
    group: null
  });
});

export default router;