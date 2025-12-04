import { Request, Response } from 'express';
import { getSupabaseService } from '../services/supabase.factory';
export declare class PostsController {
    getNationalPosts(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getInternationalPosts(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createPost(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    toggleLike(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deletePost(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const postsController: PostsController;
export { getSupabaseService };
//# sourceMappingURL=posts.controller.d.ts.map