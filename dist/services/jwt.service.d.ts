export interface JWTPayload {
    userId: string;
    community: string;
    isAdmin: boolean;
    permissions?: string[];
    adminLevel?: string;
}
export declare class JWTService {
    private secret;
    constructor();
    generateToken(payload: JWTPayload): string;
    verifyToken(token: string): JWTPayload | null;
    decodeToken(token: string): JWTPayload | null;
    refreshToken(oldToken: string): string | null;
}
export declare function getJWTService(): JWTService;
export default JWTService;
//# sourceMappingURL=jwt.service.d.ts.map