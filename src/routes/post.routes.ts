import { Router } from 'express';
import { protect, isAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPostSchema } from '../schemas/post.schema';
import { postsController } from '../controllers/posts.controller';

const router = Router();

// Tout le monde peut lire les posts, il faut juste être connecté
router.get('/national', protect, postsController.getNationalPosts);
router.get('/international', protect, postsController.getInternationalPosts);

// ✅ RÈGLE CORRIGÉE : Seuls les administrateurs peuvent créer ou supprimer des posts.
router.post('/', protect, isAdmin, validate(createPostSchema), postsController.createPost);
router.delete('/:id', protect, isAdmin, postsController.deletePost);

export default router;
