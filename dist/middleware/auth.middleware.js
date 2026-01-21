"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSuperAdmin = exports.isAdmin = exports.protectTemp = exports.protect = void 0;
const supabase_1 = require("../utils/supabase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
exports.protect = (0, express_async_handler_1.default)(async (req, res, next) => {
    let token;
    // Vérifier si le token est dans l'en-tête Authorization (Bearer Token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
        try {
            // 1. Valider le token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // 2. Récupérer l'utilisateur depuis Supabase pour avoir les données à jour
            const { data: user, error } = await supabase_1.supabase
                .from('users')
                .select('*')
                .eq('id', decoded.userId)
                .single();
            if (error || !user) {
                res.status(401);
                throw new Error('Non autorisé, utilisateur non trouvé.');
            }
            req.user = user;
            next();
        }
        catch (error) {
            res.status(401);
            throw new Error('Non autorisé: Token invalide ou expiré.');
        }
    }
    else {
        res.status(401);
        throw new Error('Non autorisé, pas de token');
    }
});
exports.protectTemp = (0, express_async_handler_1.default)(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extraire le token
            token = req.headers.authorization.split(' ')[1];
            // 2. Vérifier le token avec la clé secrète TEMPORAIRE
            const decoded = jsonwebtoken_1.default.verify(token, process.env.TEMP_JWT_SECRET);
            console.log('Decoded temp token in protectTemp:', decoded);
            // 3. S'assurer que c'est bien un token temporaire
            if (!decoded.temp || !decoded.phoneNumber) {
                res.status(401);
                throw new Error('Non autorisé, token temporaire invalide.');
            }
            req.phoneNumber = decoded.phoneNumber;
            next();
        }
        catch (error) {
            console.error('Erreur de token temporaire:', error);
            res.status(401);
            throw new Error('Non autorisé, le token temporaire a échoué');
        }
    }
    if (!token) {
        res.status(401);
        throw new Error('Non autorisé, pas de token temporaire');
    }
});
exports.isAdmin = (0, express_async_handler_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user || !user.is_admin) {
        res.status(403);
        throw new Error('Accès refusé: Permissions d\'administrateur requises.');
    }
    next();
});
exports.isSuperAdmin = (0, express_async_handler_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user || user.admin_level !== 'super') {
        res.status(403);
        throw new Error('Accès refusé: Permissions de super-administrateur requises.');
    }
    next();
});
//# sourceMappingURL=auth.middleware.js.map