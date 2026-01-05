"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostSchema = void 0;
const zod_1 = require("zod");
exports.createPostSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string()
            .min(1, 'Le contenu du post ne peut pas être vide.')
            .max(1000, 'Le contenu ne peut pas dépasser 1000 caractères.'),
        visibility: zod_1.z.enum(['national', 'international'])
            .default('national'),
        image_urls: zod_1.z.array(zod_1.z.string().url()).optional(),
    }),
});
//# sourceMappingURL=post.schema.js.map