import { Router } from 'express';
import { PostsController } from '../controllers/posts.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const postsController = new PostsController();

// Routes posts
router.post('/', authMiddleware, (req, res) => 
  postsController.createPost(req, res)
);

router.get('/national', authMiddleware, (req, res) => 
  postsController.getNationalPosts(req, res)
);

router.get('/international', authMiddleware, (req, res) => 
  postsController.getInternationalPosts(req, res)
);

router.post('/:id/like', authMiddleware, (req, res) => 
  postsController.toggleLike(req, res)
);

router.delete('/:id', authMiddleware, (req, res) => 
  postsController.deletePost(req, res)
);

export default router;