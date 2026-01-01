// src/schemas/auth.schema.ts
import { z } from 'zod';

export const requestOtpSchema = z.object({
  body: z.object({
    phoneNumber: z.string().min(1, 'Le numéro de téléphone est requis'),
    countryCode: z.string().min(1, 'Le code pays est requis'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phoneNumber: z.string().min(1, 'Le numéro de téléphone est requis'),
    code: z.string().length(6, 'Le code OTP doit faire 6 chiffres'),
  }),
});

export const completeProfileSchema = z.object({
  body: z.object({
    phoneNumber: z.string().min(1, 'Le numéro de téléphone est requis'),
    countryCode: z.string().min(1, 'Le code pays est requis'),
    nationality: z.string().min(1, 'La nationalité est requise'),
    nationalityName: z.string().min(1, 'Le nom de la nationalité est requis'),
    pseudo: z.string().min(3, 'Le pseudo doit faire au moins 3 caractères'),
    email: z.string().email("L'email n'est pas valide"),
    community: z.string().min(1, 'La communauté est requise'),
    avatar: z.string().url().optional().nullable(),
  }),
});
