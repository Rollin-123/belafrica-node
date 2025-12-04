import { Request, Response } from 'express';
import { getSupabaseService } from '../services/supabase.factory';
export declare class MessagesController {
    getConversations(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    sendMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createGroupChat(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getGroupChat(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createConversation(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const messagesController: MessagesController;
export { getSupabaseService };
//# sourceMappingURL=messages.controller.d.ts.map