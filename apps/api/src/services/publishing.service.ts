import { db } from '../db/client';
import { platformRegistry } from './platforms/platform-registry';
import { decryptToken } from '../utils/crypto';
import { PlatformPublishPayload } from './platforms/base-platform.service';
import { PostStatus, TargetPublishStatus } from '@socialhub/shared';
import { ENV } from '../config/env';

export class PublishingService {
  /**
   * Publishes all pending targets for a post
   */
  async publishPost(postId: string): Promise<any> {
    const post = await db.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new Error(`Post ${postId} not found`);

    await db.socialPost.update({
      where: { id: postId },
      data: { status: 'PROCESSING' },
    });

    const targetResults: any[] = [];

    for (const target of post.targets) {
      if (target.status === 'SUCCESS') {
        targetResults.push({ targetId: target.id, status: 'SKIPPED_ALREADY_SUCCESS' });
        continue;
      }

      const res = await this.publishTarget(target.id, post);
      targetResults.push(res);
    }

    // Refresh post to inspect target statuses
    const updatedPost = await db.socialPost.findUnique({ where: { id: postId } });
    const statuses = updatedPost.targets.map((t: any) => t.status);

    let finalPostStatus: PostStatus = 'PUBLISHED';
    if (statuses.every((s: TargetPublishStatus) => s === 'SUCCESS')) {
      finalPostStatus = 'PUBLISHED';
    } else if (statuses.some((s: TargetPublishStatus) => s === 'SUCCESS')) {
      finalPostStatus = 'PARTIALLY_PUBLISHED';
    } else if (statuses.every((s: TargetPublishStatus) => s === 'FAILED')) {
      finalPostStatus = 'FAILED';
    }

    await db.socialPost.update({
      where: { id: postId },
      data: {
        status: finalPostStatus,
        publishedAt: finalPostStatus !== 'FAILED' ? new Date().toISOString() : null,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'POST_PUBLISHED',
        resourceType: 'POST',
        resourceId: postId,
        details: { finalPostStatus, results: targetResults },
      },
    });

    return db.socialPost.findUnique({ where: { id: postId } });
  }

  /**
   * Publishes a single target
   */
  async publishTarget(targetId: string, parentPost?: any): Promise<any> {
    const target = await db.postTarget.findUnique({ where: { id: targetId } });
    if (!target) throw new Error(`Target ${targetId} not found`);

    const post = parentPost || (await db.socialPost.findUnique({ where: { id: target.postId } }));
    if (!post) throw new Error(`Parent post for target ${targetId} not found`);

    // Find connected account
    let connectedAccount: any = null;
    if (target.connectedAccountId) {
      connectedAccount = await db.connectedAccount.findUnique({ where: { id: target.connectedAccountId } });
    } else {
      // Find default connected account for this platform
      const accounts = await db.connectedAccount.findMany({ where: { platform: target.platform } });
      connectedAccount = accounts[0] || null;
    }

    if (!connectedAccount) {
      const errorMsg = `No active connected account configured for ${target.platform}`;
      await db.postTarget.update({
        where: { id: targetId },
        data: {
          status: 'FAILED',
          lastErrorCode: 'ACCOUNT_NOT_CONNECTED',
          lastErrorMessage: errorMsg,
          attemptsCount: (target.attemptsCount || 0) + 1,
        },
      });
      await db.publishingAttempt.create({
        data: {
          targetId,
          platform: target.platform,
          status: 'FAILED',
          errorCode: 'ACCOUNT_NOT_CONNECTED',
          errorMessage: errorMsg,
        },
      });
      return { success: false, platform: target.platform, error: errorMsg };
    }

    // Prepare payload
    const caption = target.customCaption || post.mainCaption;
    const media = (post.media || []).map((m: any) => ({
      id: m.id,
      url: m.url,
      mediaType: m.mediaType,
      mimeType: m.mimeType,
      fileName: m.fileName,
    }));

    const payload: PlatformPublishPayload = {
      caption,
      media,
      recipientPhone: target.recipientPhone,
      locationId: target.locationId,
      ctaType: target.ctaType,
      ctaUrl: target.ctaUrl,
    };

    const decryptedAccess = decryptToken(connectedAccount.accessTokenEncrypted);
    const accessToken = decryptedAccess || (connectedAccount.platform === 'LINKEDIN' ? (ENV.LINKEDIN_ACCESS_TOKEN || '') : '');
    const refreshToken = connectedAccount.refreshTokenEncrypted ? decryptToken(connectedAccount.refreshTokenEncrypted) : '';

    const context = {
      id: connectedAccount.id,
      platform: connectedAccount.platform,
      externalId: connectedAccount.externalId,
      accountName: connectedAccount.accountName,
      accessToken,
      refreshToken,
      metadata: connectedAccount.metadata,
    };

    const service = platformRegistry.getService(target.platform);
    const startTime = Date.now();

    await db.postTarget.update({
      where: { id: targetId },
      data: { status: 'PROCESSING' },
    });

    try {
      const result = await service.publish(payload, context);
      const finishedAt = new Date().toISOString();

      await db.publishingAttempt.create({
        data: {
          targetId,
          platform: target.platform,
          status: result.success ? 'SUCCESS' : 'FAILED',
          startedAt: new Date(startTime).toISOString(),
          finishedAt,
          errorCode: result.errorCode || null,
          errorMessage: result.errorMessage || null,
          responsePayload: result.rawResponse || null,
        },
      });

      if (result.success) {
        await db.postTarget.update({
          where: { id: targetId },
          data: {
            status: 'SUCCESS',
            remotePostId: result.remotePostId || null,
            publishedUrl: result.publishedUrl || null,
            publishedAt: finishedAt,
            lastErrorCode: null,
            lastErrorMessage: null,
            attemptsCount: (target.attemptsCount || 0) + 1,
          },
        });
      } else {
        await db.postTarget.update({
          where: { id: targetId },
          data: {
            status: 'FAILED',
            lastErrorCode: result.errorCode || 'PUBLISH_FAILED',
            lastErrorMessage: result.errorMessage || 'Publishing failed',
            attemptsCount: (target.attemptsCount || 0) + 1,
          },
        });
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown publishing exception';
      await db.postTarget.update({
        where: { id: targetId },
        data: {
          status: 'FAILED',
          lastErrorCode: 'UNEXPECTED_ERROR',
          lastErrorMessage: errorMsg,
          attemptsCount: (target.attemptsCount || 0) + 1,
        },
      });
      await db.publishingAttempt.create({
        data: {
          targetId,
          platform: target.platform,
          status: 'FAILED',
          errorCode: 'UNEXPECTED_ERROR',
          errorMessage: errorMsg,
        },
      });
      return { success: false, platform: target.platform, error: errorMsg };
    }
  }
}

export const publishingService = new PublishingService();
