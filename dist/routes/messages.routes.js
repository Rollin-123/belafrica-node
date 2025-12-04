"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesController = void 0;
const express_1 = require("express");
const messages_controller_1 = require("../controllers/messages.controller");
Object.defineProperty(exports, "MessagesController", { enumerable: true, get: function () { return messages_controller_1.MessagesController; } });
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const messagesController = new messages_controller_1.MessagesController();
router.get('/conversations', auth_middleware_1.authMiddleware, messagesController.getConversations);
router.get('/conversations/:id/messages', auth_middleware_1.authMiddleware, messagesController.getMessages);
router.post('/conversations', auth_middleware_1.authMiddleware, messagesController.createConversation);
router.post('/conversations/:id/messages', auth_middleware_1.authMiddleware, messagesController.sendMessage);
router.post('/group/create', auth_middleware_1.authMiddleware, messagesController.createGroupChat);
router.get('/group/:communityId', auth_middleware_1.authMiddleware, messagesController.getGroupChat);
exports.default = router;
//# sourceMappingURL=messages.routes.js.map