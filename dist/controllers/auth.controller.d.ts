import { Request, Response } from 'express';
export declare class AuthController {
    private authService;
    constructor();
    requestOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    verifyOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    completeProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=auth.controller.d.ts.map