import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      ...(message ? { message } : {}),
      ...(typeof data === 'object' && data !== null && !Array.isArray(data) ? data : { data }),
    });
  }

  static error(res: Response, message: string, statusCode = 400, code?: string, details?: any): Response {
    return res.status(statusCode).json({
      success: false,
      error: message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
    });
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return ApiResponse.success(res, data, message, 201);
  }
}
