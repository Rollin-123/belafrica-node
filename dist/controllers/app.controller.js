"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppConstants = void 0;
const constants_1 = require("../utils/constants");
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
//# sourceMappingURL=app.controller.js.map