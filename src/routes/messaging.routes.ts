/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getConversations, getMessages, sendMessage, editMessage, deleteMessage } from '../controllers/messaging.controller';
import { protect as authenticate } from '../middleware/auth.middleware';

const router = Router();

// Middleware pour logger les erreurs de validation
const logValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Erreurs de validation:', JSON.stringify(errors.array()));
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get('/conversations', authenticate, getConversations);
router.get('/conversations/:conversationId/messages', authenticate, getMessages);
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  [
    param('conversationId').isUUID(),
    body('encryptedContent').isString().notEmpty(),
    body('iv').isString().notEmpty(),
    body('replyToId').optional({ checkFalsy: true }).isUUID(),
    body('mentions').optional().isArray()
  ],
  logValidationErrors,
  sendMessage
);
router.put('/messages/:messageId', authenticate, editMessage);
router.delete('/messages/:messageId', authenticate, deleteMessage);

export default router;
