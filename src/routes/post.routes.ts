import { Router } from 'express';
import { protect, isAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPostSchema } from '../schemas/post.schema';
import { postsController } from '../controllers/posts.controller';

const router = Router();

router.get('/national', protect, postsController.getNationalPosts);
router.get('/international', protect, postsController.getInternationalPosts);

router.post('/', protect, isAdmin, validate(createPostSchema), postsController.createPost);
router.delete('/:id', protect, isAdmin, postsController.deletePost);

export default router;
