"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
const express_1 = require("express");
const messages_controller_1 = require("../controllers/messages.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const messagesController = new messages_controller_1.MessagesController();
router.post('/send', auth_middleware_1.protect, (req, res) => {
    messagesController.sendMessage(req, res);
});
router.get('/conversations', auth_middleware_1.protect, (req, res) => {
    res.json({
        success: true,
        message: 'Fonctionnalité à venir',
        conversations: []
    });
});
router.get('/conversations/:id/messages', auth_middleware_1.protect, (req, res) => {
    res.json({
        success: true,
        message: 'Fonctionnalité à venir',
        conversationId: req.params.id,
        messages: []
    });
});
router.post('/conversations', auth_middleware_1.protect, (req, res) => {
    res.json({
        success: true,
        message: 'Fonctionnalité à venir'
    });
});
router.post('/group/create', auth_middleware_1.protect, (req, res) => {
    res.json({
        success: true,
        message: 'Fonctionnalité à venir'
    });
});
router.get('/group/:communityId', auth_middleware_1.protect, (req, res) => {
    res.json({
        success: true,
        message: 'Fonctionnalité à venir',
        communityId: req.params.communityId,
        group: null
    });
});
exports.default = router;
//# sourceMappingURL=messages.routes.js.map