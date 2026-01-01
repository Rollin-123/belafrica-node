"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messaging_controller_1 = require("../controllers/messaging.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ✅ Récupérer toutes les conversations de l'utilisateur
router.get('/conversations', auth_middleware_1.protect, messaging_controller_1.getConversations);
// ✅ Récupérer les messages d'une conversation
router.get('/conversations/:conversationId/messages', auth_middleware_1.protect, messaging_controller_1.getMessages);
// ✅ Envoyer un message dans une conversation
router.post('/conversations/:conversationId/messages', auth_middleware_1.protect, messaging_controller_1.sendMessage);
exports.default = router;
//# sourceMappingURL=messaging.routes.js.map