// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodRawShape } from 'zod';

export const validate = (schema: ZodObject<ZodRawShape>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      return res.status(400).json(error);
    }
  };