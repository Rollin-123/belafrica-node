/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getConversations, getMessages, sendMessage, editMessage, deleteMessage } from '../controllers/messaging.controller';
import { protect as authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get('/conversations', authenticateToken, getConversations);

router.get('/conversations/:conversationId/messages', authenticateToken, getMessages);

router.post(
  '/conversations/:conversationId/messages',
  authenticateToken,
  [
    param('conversationId').isUUID(),
    body('encryptedContent').isString().notEmpty(),
    body('iv').isString().notEmpty(),
    body('replyToId').optional({ checkFalsy: true }).isUUID(),
    body('mentions').optional().isArray()
  ],
  handleValidationErrors,
  sendMessage
);

router.put('/messages/:messageId', authenticateToken, editMessage);
router.delete('/messages/:messageId', authenticateToken, deleteMessage);

export default router;