"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_service_1 = require("../services/jwt.service");
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Token d\'authentification manquant'
            });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Token invalide'
            });
        }
        const jwtService = (0, jwt_service_1.getJWTService)();
        const decoded = jwtService.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide ou expiré'
            });
        }
        // Ajouter les informations de l'utilisateur à la requête
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error('🔥 Erreur authMiddleware:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expiré'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Token invalide'
            });
        }
        return res.status(500).json({
            error: 'Erreur d\'authentification'
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map