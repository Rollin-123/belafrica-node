"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const post_schema_1 = require("../schemas/post.schema");
const posts_controller_1 = require("../controllers/posts.controller");
const router = (0, express_1.Router)();
router.get('/national', auth_middleware_1.protect, posts_controller_1.postsController.getNationalPosts);
router.get('/international', auth_middleware_1.protect, posts_controller_1.postsController.getInternationalPosts);
router.post('/', auth_middleware_1.protect, auth_middleware_1.isAdmin, (0, validate_middleware_1.validate)(post_schema_1.createPostSchema), posts_controller_1.postsController.createPost);
router.delete('/:id', auth_middleware_1.protect, auth_middleware_1.isAdmin, posts_controller_1.postsController.deletePost);
exports.default = router;
//# sourceMappingURL=post.routes.js.map