/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
const messagesController = new MessagesController();


router.post('/send', protect, (req, res) => {
  messagesController.sendMessage(req, res);
});

router.get('/conversations', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir',
    conversations: []
  });
});

router.get('/conversations/:id/messages', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir',
    conversationId: req.params.id,
    messages: []
  });
});

router.post('/conversations', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir'
  });
});

router.post('/group/create', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir'
  });
});

router.get('/group/:communityId', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité à venir',
    communityId: req.params.communityId,
    group: null
  });
});
export default router;