import { Request, Response } from 'express';
import { getSupabaseService } from '../services/supabase.factory';
export declare class MessagesController {
    getConversations(req: Request, res: Response): Promise<void>;
    getMessages(req: Request, res: Response): Promise<void>;
    createConversation(req: Request, res: Response): Promise<void>;
    sendMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createGroupChat(req: Request, res: Response): Promise<void>;
    getGroupChat(req: Request, res: Response): Promise<void>;
}
export declare const messagesController: MessagesController;
export { getSupabaseService };
//# sourceMappingURL=messages.controller.d.ts.map