import { Router } from 'express';
import { createPost, getPosts, deletePost } from '../controllers/post.controller';
import { protect, isAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPostSchema } from '../schemas/post.schema';

const router = Router();

// Tout le monde peut lire les posts, il faut juste être connecté
router.get('/', protect, getPosts);

// ✅ RÈGLE CORRIGÉE : Seuls les administrateurs peuvent créer ou supprimer des posts.
router.post('/', protect, isAdmin, validate(createPostSchema), createPost);
router.delete('/:id', protect, isAdmin, deletePost);

export default router;
