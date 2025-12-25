"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePost = exports.getPosts = exports.createPost = void 0;
const supabase_1 = require("../utils/supabase");
const createPost = async (req, res) => {
    // @ts-ignore
    const userId = req.user?.userId;
    const { content, visibility, image_url } = req.body;
    if (!content || !visibility) {
        return res.status(400).json({ success: false, error: 'Le contenu et la visibilité sont requis.' });
    }
    try {
        const { data, error } = await supabase_1.supabase
            .from('posts')
            .insert({
            user_id: userId,
            content,
            visibility,
            image_url
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
const getPosts = async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('posts')
            .select('*, user:users(pseudo, avatar_url)')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getPosts = getPosts;
const deletePost = async (req, res) => {
    // @ts-ignore
    const userId = req.user?.userId;
    const { id } = req.params;
    try {
        const { error } = await supabase_1.supabase.from('posts').delete().match({ id: id, user_id: userId });
        if (error)
            throw error;
        res.status(200).json({ success: true, message: 'Publication supprimée.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.deletePost = deletePost;
//# sourceMappingURL=post.controller.js.map