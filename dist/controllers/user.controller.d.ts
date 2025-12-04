import { Request, Response } from 'express';
import { getSupabaseService } from '../services/supabase.factory';
export declare class UserController {
    getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateAvatar(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCommunityUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getUserById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const userController: UserController;
export { getSupabaseService };
//# sourceMappingURL=user.controller.d.ts.map