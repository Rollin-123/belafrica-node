"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const express_1 = require("express");
const messaging_controller_1 = require("../controllers/messaging.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/conversations', auth_middleware_1.protect, messaging_controller_1.getConversations);
router.get('/conversations/:conversationId/messages', auth_middleware_1.protect, messaging_controller_1.getMessages);
router.post('/conversations/:conversationId/messages', auth_middleware_1.protect, messaging_controller_1.sendMessage);
exports.default = router;
//# sourceMappingURL=messaging.routes.js.map