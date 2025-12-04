export declare const config: {
    env: string;
    port: number;
    frontendUrl: string;
    supabase: {
        url: string;
        anonKey: string;
        serviceKey: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    telegram: {
        botToken: string;
        creatorChatId: string;
    };
    security: {
        corsOrigin: string[];
        rateLimitWindowMs: number;
        rateLimitMaxRequests: number;
    };
    logging: {
        level: string;
    };
};
export declare function validateConfig(): void;
//# sourceMappingURL=environments.d.ts.map