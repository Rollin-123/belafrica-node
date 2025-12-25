"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const posts_controller_1 = require("../controllers/posts.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Routes pour les posts
router.get('/national', auth_middleware_1.protect, posts_controller_1.postsController.getNationalPosts);
router.get('/international', auth_middleware_1.protect, posts_controller_1.postsController.getInternationalPosts);
router.post('/', auth_middleware_1.protect, auth_middleware_1.isAdmin, posts_controller_1.postsController.createPost);
router.delete('/:id', auth_middleware_1.protect, auth_middleware_1.isAdmin, posts_controller_1.postsController.deletePost);
router.post('/:id/like', auth_middleware_1.protect, posts_controller_1.postsController.toggleLike);
exports.default = router;
//# sourceMappingURL=post.routes.js.map