import { Request, Response } from 'express';
import { db } from '../db/client';
import { verifyPassword, generateJwtToken } from '../utils/crypto';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../utils/api-response';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

      if (!user) {
        ApiResponse.error(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
        return;
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        ApiResponse.error(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
        return;
      }

      const token = generateJwtToken({ userId: user.id });

      // Set HTTP-only secure cookie
      res.cookie('socialhub_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600 * 1000,
      });

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'AUTH_LOGIN',
          resourceType: 'AUTH',
          details: { email: user.email },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      ApiResponse.success(
        res,
        {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
            timezone: user.timezone,
          },
        },
        'Login successful'
      );
    } catch (err: any) {
      ApiResponse.error(res, err.message || 'Login failed', 500);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('socialhub_token');
    ApiResponse.success(res, null, 'Logged out successfully');
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    ApiResponse.success(res, { user: req.user });
  }
}

export const authController = new AuthController();
