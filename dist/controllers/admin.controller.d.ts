import { Request, Response } from 'express';
export declare class AdminController {
    private adminService;
    constructor();
    generateCode(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    validateCode(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getAdminRequests(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateRequestStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=admin.controller.d.ts.map