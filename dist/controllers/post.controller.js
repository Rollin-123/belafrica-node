"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePost = exports.getPosts = exports.createPost = void 0;
const supabase_1 = require("../utils/supabase");
// ✅ RÈGLE : Seuls les administrateurs peuvent créer un post.
const createPost = async (req, res) => {
    try {
        const { content, visibility } = req.body;
        const authorId = req.user?.userId;
        // Définir la date d'expiration selon la documentation
        const expirationHours = visibility === 'national' ? 48 : 72;
        const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
        const { data, error } = await supabase_1.supabase
            .from('posts')
            .insert({
            content,
            visibility,
            expires_at: expiresAt.toISOString(),
            author_id: authorId,
            community: req.user?.community,
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createPost = createPost;
// Tout utilisateur connecté peut lire les posts
const getPosts = async (req, res) => {
    try {
        // ✅ FILTRAGE : On ne récupère que les posts non expirés.
        const { data, error } = await supabase_1.supabase
            .from('posts')
            .select(`
      *,
      author:users ( pseudo, avatar_url )
    `).gt('expires_at', new Date().toISOString());
        if (error)
            throw error;
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getPosts = getPosts;
// ✅ RÈGLE : Seul un administrateur peut supprimer un post.
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        // Vérifier que le post existe avant de le supprimer.
        const { data: post, error: fetchError } = await supabase_1.supabase
            .from('posts')
            .select('id')
            .eq('id', id)
            .single();
        if (fetchError || !post) {
            return res.status(404).json({ success: false, error: 'Post non trouvé' });
        }
        const { error } = await supabase_1.supabase.from('posts').delete().eq('id', id);
        if (error)
            throw error;
        res.json({ success: true, message: 'Post supprimé' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.deletePost = deletePost;
//# sourceMappingURL=post.controller.js.map