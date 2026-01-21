import { UserPayload } from './user';  


declare module 'express' {  
  interface Request {
    user?: UserPayload;
    phoneNumber?: string; // Pour les tokens temporaires (auth.controller.ts)
    requiredPermission?: string; // Pour admin.middleware.ts
  }
}
