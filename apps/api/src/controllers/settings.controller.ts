import { Response } from 'express';
import { db } from '../db/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { ENV } from '../config/env';
import { ApiResponse } from '../utils/api-response';

export class SettingsController {
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await db.user.findFirst();
      const auditLogs = await db.auditLog.findMany({ take: 20 });

      const integrationReadiness = {
        linkedin: {
          configured: Boolean(ENV.LINKEDIN_CLIENT_ID && ENV.LINKEDIN_CLIENT_SECRET),
          clientIdMasked: ENV.LINKEDIN_CLIENT_ID ? `${ENV.LINKEDIN_CLIENT_ID.slice(0, 6)}...` : null,
          redirectUri: ENV.LINKEDIN_REDIRECT_URI,
        },
        facebook: {
          configured: Boolean(ENV.META_APP_ID && ENV.META_APP_SECRET),
          appIdMasked: ENV.META_APP_ID ? `${ENV.META_APP_ID.slice(0, 4)}...` : null,
          redirectUri: ENV.META_REDIRECT_URI,
        },
        instagram: {
          configured: Boolean(ENV.META_APP_ID && ENV.META_APP_SECRET),
          appIdMasked: ENV.META_APP_ID ? `${ENV.META_APP_ID.slice(0, 4)}...` : null,
          redirectUri: ENV.META_INSTAGRAM_REDIRECT_URI,
        },
        googleBusiness: {
          configured: Boolean(ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET),
          clientIdMasked: ENV.GOOGLE_CLIENT_ID ? `${ENV.GOOGLE_CLIENT_ID.slice(0, 8)}...` : null,
          redirectUri: ENV.GOOGLE_REDIRECT_URI,
        },
        aiAssistant: {
          configured: Boolean(ENV.AI_API_KEY),
          provider: ENV.AI_PROVIDER,
          model: ENV.AI_MODEL,
        },
      };

      ApiResponse.success(res, {
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              timezone: user.timezone || 'UTC',
              role: user.role,
            }
          : null,
        integrationReadiness,
        auditLogs,
        version: '1.0.0',
      });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, timezone, currentPassword, newPassword } = req.body;
      const user = await db.user.findFirst();

      if (!user) {
        ApiResponse.error(res, 'User not found', 404);
        return;
      }

      const updates: any = {};
      if (name) updates.name = name;
      if (timezone) updates.timezone = timezone;

      if (newPassword) {
        if (!currentPassword) {
          ApiResponse.error(res, 'Current password is required to change password.', 400);
          return;
        }
        const isMatch = await verifyPassword(currentPassword, user.passwordHash);
        if (!isMatch) {
          ApiResponse.error(res, 'Current password does not match.', 400);
          return;
        }
        updates.passwordHash = await hashPassword(newPassword);
      }

      const updated = await db.user.update({
        where: { id: user.id },
        data: updates,
      });

      ApiResponse.success(
        res,
        {
          user: {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            timezone: updated.timezone,
          },
        },
        'Profile updated successfully'
      );
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }
}

export const settingsController = new SettingsController();
