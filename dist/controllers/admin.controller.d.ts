import { Request, Response } from 'express';
export declare class AdminController {
    private adminService;
    generateAdminCode(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    validateAdminCode(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getAdminRequests(req: Request, res: Response): Promise<void>;
    updateRequestStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=admin.controller.d.ts.map