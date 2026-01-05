import { Router } from 'express';
import { postsController } from '../controllers/posts.controller';
import { protect, isAdmin } from '../middleware/auth.middleware';

const router = Router();

// Routes pour les posts
router.get('/national', protect, postsController.getNationalPosts);
router.get('/international', protect, postsController.getInternationalPosts);
router.post('/', protect, isAdmin, postsController.createPost);
router.delete('/:id', protect, isAdmin, postsController.deletePost);
router.post('/:id/like', protect, postsController.toggleLike);

export default router;