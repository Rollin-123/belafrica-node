export declare class AuthService {
    findUserByPhone(phoneNumber: string): Promise<any>;
    saveOTP(phoneNumber: string, code: string): Promise<boolean>;
    verifyOTP(phoneNumber: string, code: string): Promise<boolean>;
    createUser(userData: any): Promise<any>;
}
//# sourceMappingURL=auth.service.d.ts.map