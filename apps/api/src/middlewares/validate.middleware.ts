import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiResponse } from '../utils/api-response';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Replace with sanitized/parsed data
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          field: issue.path.slice(1).join('.'),
          message: issue.message,
        }));
        ApiResponse.error(
          res,
          'Validation failed: ' + errorMessages.map((e) => `${e.field}: ${e.message}`).join(', '),
          422,
          'VALIDATION_ERROR',
          errorMessages
        );
        return;
      }
      next(error);
    }
  };
};
