"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postTestValidation = exports.getGeoDebug = void 0;
const geolocation_1 = require("../utils/geolocation");
const getGeoDebug = async (req, res) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
        const location = await (0, geolocation_1.detectCountryByIP)(ip);
        res.json({
            success: true,
            ip: ip,
            location: location,
            headers: {
                'x-forwarded-for': req.headers['x-forwarded-for'],
                'x-real-ip': req.headers['x-real-ip'],
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getGeoDebug = getGeoDebug;
const postTestValidation = async (req, res) => {
    try {
        const { phoneNumber, countryCode } = req.body;
        if (!phoneNumber || !countryCode) {
            return res.status(400).json({ success: false, error: 'Numéro et code pays requis' });
        }
        const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
        const location = await (0, geolocation_1.detectCountryByIP)(ip);
        res.json({
            success: true,
            clientIP: ip,
            location: location,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.postTestValidation = postTestValidation;
//# sourceMappingURL=debug.controller.js.map