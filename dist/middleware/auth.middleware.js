"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSuperAdmin = exports.isAdmin = exports.protectTemp = exports.protect = void 0;
const supabase_1 = require("../utils/supabase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Wrapper pour les middlewares asynchrones afin de catcher les erreurs.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
/**
 * Middleware pour vérifier si un utilisateur est authentifié via un token JWT.
 * Il récupère le token de l'en-tête 'Authorization', le valide avec Supabase,
 * et attache l'ID de l'utilisateur à l'objet `req` pour les prochains middlewares/contrôleurs.
 */
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            // 1. Valider le token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // 2. Récupérer l'utilisateur depuis Supabase pour avoir les données à jour
            const { data: user, error } = await supabase_1.supabase
                .from('users')
                .select('*')
                .eq('id', decoded.userId)
                .single();
            if (error || !user) {
                return res.status(401).json({ success: false, error: 'Non autorisé, utilisateur non trouvé.' });
            }
            // 3. Attacher l'objet utilisateur complet à la requête
            // @ts-ignore
            req.user = user;
            next();
        }
        catch (error) {
            return res.status(401).json({ success: false, error: 'Non autorisé: Token invalide ou expiré.' });
        }
    }
    if (!token) {
        return res.status(401).json({ success: false, error: 'Non autorisé, pas de token' });
    }
};
exports.protect = protect;
exports.protectTemp = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extraire le token
            token = req.headers.authorization.split(' ')[1];
            // 2. Vérifier le token avec la clé secrète TEMPORAIRE
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // 3. S'assurer que c'est bien un token temporaire
            if (!decoded.temp) {
                return res.status(401).json({ success: false, error: 'Non autorisé, token invalide.' });
            }
            // 4. Attacher le payload décodé à la requête
            // @ts-ignore
            req.user = { id: decoded.userId }; // On a juste besoin de l'ID pour `completeProfile`
            next();
        }
        catch (error) {
            console.error('Erreur de token temporaire:', error);
            return res.status(401).json({ success: false, error: 'Non autorisé, le token temporaire a échoué' });
        }
    }
    if (!token) {
        return res.status(401).json({ success: false, error: 'Non autorisé, pas de token temporaire' });
    }
});
/**
 * Middleware pour vérifier si l'utilisateur authentifié est un administrateur (simple ou super).
 * Doit être utilisé APRÈS le middleware `protect` qui attache l'objet utilisateur.
 */
const isAdmin = async (req, res, next) => {
    // @ts-ignore
    const user = req.user;
    if (!user || !user.is_admin) {
        return res.status(403).json({ success: false, error: 'Accès refusé: Permissions d\'administrateur requises.' });
    }
    next();
};
exports.isAdmin = isAdmin;
/**
 * Middleware pour vérifier si l'utilisateur authentifié est un super-administrateur.
 * Doit être utilisé APRÈS le middleware `protect`.
 * Il vérifie le rôle de l'utilisateur dans la base de données.
 */
const isSuperAdmin = async (req, res, next) => {
    // @ts-ignore
    const user = req.user;
    if (!user || user.admin_level !== 'super') {
        return res.status(403).json({ success: false, error: 'Accès refusé: Permissions de super-administrateur requises.' });
    }
    next();
};
exports.isSuperAdmin = isSuperAdmin;
//# sourceMappingURL=auth.middleware.js.map