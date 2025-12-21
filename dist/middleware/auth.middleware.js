"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const protect = (req, res, next) => {
    const bearer = req.headers.authorization;
    if (!bearer || !bearer.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Accès non autorisé' });
    }
    const token = bearer.split(' ')[1].trim();
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (error) {
        console.error('Erreur de token JWT:', error);
        return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
    }
};
exports.protect = protect;
const isAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            error: "Accès refusé. Seuls les administrateurs peuvent effectuer cette action.",
        });
    }
    next();
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=auth.middleware.js.map