import { UserPayload } from './user';  


declare module 'express' { 
  interface Request {
    user?: UserPayload;
    phoneNumber?: string;  
    requiredPermission?: string;  
  }
}
