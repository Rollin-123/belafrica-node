/**
 * Demande un code OTP (One-Time Password) via Supabase Auth.
 * La géolocalisation est vérifiée ici.
 */
export declare const requestOtp: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Vérifie un code OTP et retourne une session (token JWT).
 */
export declare const verifyOtp: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const completeProfile: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
//# sourceMappingURL=auth.controller.d.ts.map