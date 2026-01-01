import { Request, Response } from 'express';
/**
 * ✅ Récupère toutes les conversations de l'utilisateur authentifié.
 */
export declare const getConversations: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * ✅ Récupère les messages d'une conversation spécifique.
 */
export declare const getMessages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * ✅ Envoie un message dans une conversation.
 */
export declare const sendMessage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=messaging.controller.d.ts.map