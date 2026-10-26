import { Response } from 'express';
import { db } from '../db/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { PlatformType } from '@socialhub/shared';
import { ApiResponse } from '../utils/api-response';

export class AnalyticsController {
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const posts = await db.socialPost.findMany();
      const accounts = await db.connectedAccount.findMany();
      const targets = await db.postTarget.findMany();

      const totalPosts = posts.length;
      const publishedPosts = posts.filter(
        (p: any) => p.status === 'PUBLISHED' || p.status === 'PARTIALLY_PUBLISHED'
      ).length;
      const scheduledPosts = posts.filter((p: any) => p.status === 'SCHEDULED').length;
      const draftPosts = posts.filter((p: any) => p.status === 'DRAFT').length;
      const failedPosts = posts.filter((p: any) => p.status === 'FAILED').length;

      const platforms: PlatformType[] = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE_BUSINESS'];
      const platformStats: Record<string, any> = {};

      for (const plt of platforms) {
        const pltTargets = targets.filter((t: any) => t.platform === plt);
        const isConnected = accounts.some((a: any) => a.platform === plt && a.status === 'CONNECTED');
        platformStats[plt] = {
          published: pltTargets.filter((t: any) => t.status === 'SUCCESS').length,
          scheduled: pltTargets.filter((t: any) => t.status === 'SCHEDULED').length,
          failed: pltTargets.filter((t: any) => t.status === 'FAILED').length,
          connected: isConnected,
        };
      }

      const recentErrors = targets
        .filter((t: any) => t.status === 'FAILED' && t.lastErrorMessage)
        .slice(0, 5)
        .map((t: any) => ({
          id: t.id,
          platform: t.platform,
          errorCode: t.lastErrorCode,
          errorMessage: t.lastErrorMessage,
          updatedAt: t.updatedAt,
        }));

      ApiResponse.success(res, {
        summary: {
          totalPosts,
          publishedPosts,
          scheduledPosts,
          draftPosts,
          failedPosts,
          connectedAccountsCount: accounts.filter((a: any) => a.status === 'CONNECTED').length,
          platformStats,
          recentErrors,
        },
      });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async getPlatformStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const targets = await db.postTarget.findMany();
      const accounts = await db.connectedAccount.findMany();

      const platforms: PlatformType[] = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE_BUSINESS'];
      const data = platforms.map((p) => {
        const pTargets = targets.filter((t: any) => t.platform === p);
        const acc = accounts.find((a: any) => a.platform === p);
        return {
          platform: p,
          connectedAccount: acc ? acc.accountName : null,
          totalAttempts: pTargets.length,
          successCount: pTargets.filter((t: any) => t.status === 'SUCCESS').length,
          failedCount: pTargets.filter((t: any) => t.status === 'FAILED').length,
          pendingCount: pTargets.filter((t: any) => t.status === 'PENDING' || t.status === 'SCHEDULED').length,
        };
      });

      ApiResponse.success(res, { platforms: data });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }
}

export const analyticsController = new AnalyticsController();
