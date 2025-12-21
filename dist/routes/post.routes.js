"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const post_schema_1 = require("../schemas/post.schema");
const router = (0, express_1.Router)();
// Tout le monde peut lire les posts, il faut juste être connecté
router.get('/', auth_middleware_1.protect, post_controller_1.getPosts);
// ✅ RÈGLE CORRIGÉE : Seuls les administrateurs peuvent créer ou supprimer des posts.
router.post('/', auth_middleware_1.protect, auth_middleware_1.isAdmin, (0, validate_middleware_1.validate)(post_schema_1.createPostSchema), post_controller_1.createPost);
router.delete('/:id', auth_middleware_1.protect, auth_middleware_1.isAdmin, post_controller_1.deletePost);
exports.default = router;
//# sourceMappingURL=post.routes.js.map