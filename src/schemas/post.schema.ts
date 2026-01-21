/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    content: z.string()
      .min(1, 'Le contenu du post ne peut pas être vide.')
      .max(1000, 'Le contenu ne peut pas dépasser 1000 caractères.'),
    visibility: z.enum(['national', 'international'])
      .default('national'),
    image_urls: z.array(z.string().url()).optional(),
  }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;