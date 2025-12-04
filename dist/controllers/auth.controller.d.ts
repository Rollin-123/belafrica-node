import { Request, Response } from 'express';
export declare class AuthController {
    private authService;
    requestOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    verifyOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    completeProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    verifyToken(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=auth.controller.d.ts.map