export declare class AdminService {
    generateAdminCode(community: string, permissions?: string[]): Promise<{
        success: boolean;
        code: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        code?: undefined;
    }>;
    validateAdminCode(code: string, userId: string): Promise<{
        success: boolean;
        permissions: any;
        community: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        permissions?: undefined;
        community?: undefined;
    }>;
}
//# sourceMappingURL=admin.service.d.ts.map