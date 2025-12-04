"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
Object.defineProperty(exports, "UserController", { enumerable: true, get: function () { return user_controller_1.UserController; } });
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
router.get('/profile', auth_middleware_1.authMiddleware, userController.getProfile);
router.put('/profile', auth_middleware_1.authMiddleware, userController.updateProfile);
router.put('/profile/avatar', auth_middleware_1.authMiddleware, userController.updateAvatar);
router.get('/community', auth_middleware_1.authMiddleware, userController.getCommunityUsers);
router.get('/:id', auth_middleware_1.authMiddleware, userController.getUserById);
exports.default = router;
//# sourceMappingURL=user.routes.js.map