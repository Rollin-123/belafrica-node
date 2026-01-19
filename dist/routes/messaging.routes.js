"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const messaging_controller_1 = require("../controllers/messaging.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
router.get('/conversations', auth_middleware_1.protect, messaging_controller_1.getConversations);
router.get('/conversations/:conversationId/messages', auth_middleware_1.protect, messaging_controller_1.getMessages);
router.post('/conversations/:conversationId/messages', auth_middleware_1.protect, [
    (0, express_validator_1.param)('conversationId').isUUID(),
    (0, express_validator_1.body)('encryptedContent').isString().notEmpty(),
    (0, express_validator_1.body)('iv').isString().notEmpty(),
    (0, express_validator_1.body)('replyToId').optional({ checkFalsy: true }).isUUID(),
    (0, express_validator_1.body)('mentions').optional().isArray()
], handleValidationErrors, messaging_controller_1.sendMessage);
router.put('/messages/:messageId', auth_middleware_1.protect, messaging_controller_1.editMessage);
router.delete('/messages/:messageId', auth_middleware_1.protect, messaging_controller_1.deleteMessage);
exports.default = router;
//# sourceMappingURL=messaging.routes.js.map