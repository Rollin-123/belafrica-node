"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const posts_controller_1 = require("../controllers/posts.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const postsController = new posts_controller_1.PostsController();
// Routes posts
router.post('/', auth_middleware_1.authMiddleware, (req, res) => postsController.createPost(req, res));
router.get('/national', auth_middleware_1.authMiddleware, (req, res) => postsController.getNationalPosts(req, res));
router.get('/international', auth_middleware_1.authMiddleware, (req, res) => postsController.getInternationalPosts(req, res));
router.post('/:id/like', auth_middleware_1.authMiddleware, (req, res) => postsController.toggleLike(req, res));
router.delete('/:id', auth_middleware_1.authMiddleware, (req, res) => postsController.deletePost(req, res));
exports.default = router;
//# sourceMappingURL=posts.routes.js.map