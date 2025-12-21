import { Request, Response, NextFunction } from 'express';
interface UserPayload {
    userId: string;
    isAdmin: boolean;
    community: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}
export declare const protect: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const isAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export {};
//# sourceMappingURL=auth.middleware.d.ts.map