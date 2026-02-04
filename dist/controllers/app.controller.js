"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTelegramWebhook = exports.getAppConstants = void 0;
const constants_1 = require("../utils/constants");
const telegram_service_1 = require("../services/telegram.service");
/**
 * Expose les constantes publiques de l'application au frontend.
 */
const getAppConstants = (req, res) => {
    const publicConstants = {
        AFRICAN_COUNTRIES: constants_1.APP_CONSTANTS.AFRICAN_COUNTRIES,
        COUNTRY_NAMES: constants_1.APP_CONSTANTS.COUNTRY_NAMES,
        PHONE_COUNTRY_MAPPING: constants_1.APP_CONSTANTS.PHONE_COUNTRY_MAPPING,
    };
    res.status(200).json({ success: true, data: publicConstants });
};
exports.getAppConstants = getAppConstants;
const handleTelegramWebhook = (req, res) => {
    if (telegram_service_1.bot) {
        telegram_service_1.bot.processUpdate(req.body);
        res.sendStatus(200);
    }
    else {
        console.error('⚠️ Tentative de webhook mais le bot n\'est pas initialisé.');
        res.sendStatus(500);
    }
};
exports.handleTelegramWebhook = handleTelegramWebhook;
//# sourceMappingURL=app.controller.js.map