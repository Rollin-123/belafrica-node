import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase';
import jwt from 'jsonwebtoken';

/**
 * Middleware pour vérifier si un utilisateur est authentifié via un token JWT.
 * Il récupère le token de l'en-tête 'Authorization', le valide avec Supabase,
 * et attache l'ID de l'utilisateur à l'objet `req` pour les prochains middlewares/contrôleurs.
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Non autorisé: Token manquant ou malformé.' });
    }

    const token = authHeader.split(' ')[1];

    // Essayer de valider avec Supabase (pour les sessions établies)
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser(token);

    if (supabaseUser) {
        // @ts-ignore
        req.user = { userId: supabaseUser.id };
        return next();
    }

    // Si Supabase échoue, essayer de valider comme un token temporaire
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { phoneNumber: string };
        if (decoded.phoneNumber) {
            // @ts-ignore
            req.user = { phoneNumber: decoded.phoneNumber };
            return next();
        }
    } catch (jwtError) {
        // Si les deux échouent, le token est invalide
        return res.status(401).json({ success: false, error: 'Non autorisé: Token invalide ou expiré.' });
    }

    return res.status(401).json({ success: false, error: 'Non autorisé: Token invalide.' });
};

/**
 * Middleware pour vérifier si l'utilisateur authentifié est un administrateur (simple ou super).
 * Doit être utilisé APRÈS le middleware `protect`.
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, error: 'Utilisateur non authentifié.' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('is_admin, admin_level')
            .eq('id', userId)
            .single();

        if (error || !data || !data.is_admin) {
            return res.status(403).json({ success: false, error: 'Accès refusé: Permissions d\'administrateur requises.' });
        }

        next();
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};
/**
 * Middleware pour vérifier si l'utilisateur authentifié est un super-administrateur.
 * Doit être utilisé APRÈS le middleware `protect`.
 * Il vérifie le rôle de l'utilisateur dans la base de données.
 */
export const isSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, error: 'Utilisateur non authentifié.' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('admin_level')
            .eq('id', userId)
            .single();

        if (error || !data || data.admin_level !== 'super') {
            return res.status(403).json({ success: false, error: 'Accès refusé: Permissions de super-administrateur requises.' });
        }

        next();
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};