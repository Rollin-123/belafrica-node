import { z } from 'zod';
export declare const createPostSchema: z.ZodObject<{
    body: z.ZodObject<{
        content: z.ZodString;
        visibility: z.ZodDefault<z.ZodEnum<{
            national: "national";
            international: "international";
        }>>;
        image_urls: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
//# sourceMappingURL=post.schema.d.ts.map