import { z } from 'zod';
export declare const requestOtpSchema: z.ZodObject<{
    body: z.ZodObject<{
        phoneNumber: z.ZodString;
        countryCode: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const verifyOtpSchema: z.ZodObject<{
    body: z.ZodObject<{
        phoneNumber: z.ZodString;
        code: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const completeProfileSchema: z.ZodObject<{
    body: z.ZodObject<{
        phoneNumber: z.ZodString;
        countryCode: z.ZodString;
        nationality: z.ZodString;
        nationalityName: z.ZodString;
        pseudo: z.ZodString;
        email: z.ZodString;
        community: z.ZodString;
        avatar: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=auth.schema.d.ts.map