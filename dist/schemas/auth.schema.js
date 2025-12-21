"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeProfileSchema = exports.verifyOtpSchema = exports.requestOtpSchema = void 0;
// src/schemas/auth.schema.ts
const zod_1 = require("zod");
exports.requestOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: zod_1.z.string().min(1, 'Le numéro de téléphone est requis'),
        countryCode: zod_1.z.string().min(1, 'Le code pays est requis'),
    }),
});
exports.verifyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: zod_1.z.string().min(1, 'Le numéro de téléphone est requis'),
        code: zod_1.z.string().length(6, 'Le code OTP doit faire 6 chiffres'),
    }),
});
exports.completeProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: zod_1.z.string().min(1, 'Le numéro de téléphone est requis'),
        countryCode: zod_1.z.string().min(1, 'Le code pays est requis'),
        nationality: zod_1.z.string().min(1, 'La nationalité est requise'),
        nationalityName: zod_1.z.string().min(1, 'Le nom de la nationalité est requis'),
        pseudo: zod_1.z.string().min(3, 'Le pseudo doit faire au moins 3 caractères'),
        email: zod_1.z.string().email("L'email n'est pas valide"),
        community: zod_1.z.string().min(1, 'La communauté est requise'),
        avatar: zod_1.z.string().url().optional().nullable(),
    }),
});
//# sourceMappingURL=auth.schema.js.map