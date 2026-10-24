import { Response } from 'express';
import { db } from '../db/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { publishingService } from '../services/publishing.service';
import { schedulePostJob, cancelScheduledJob } from '../queue/publishing.queue';
import { PlatformType, PLATFORM_CONFIGS } from '@socialhub/shared';
import { ApiResponse } from '../utils/api-response';

export class PostsController {
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, search } = req.query;
      let posts = await db.socialPost.findMany();

      if (status && typeof status === 'string' && status !== 'ALL') {
        posts = posts.filter((p: any) => p.status === status);
      }

      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        posts = posts.filter((p: any) => p.mainCaption.toLowerCase().includes(q));
      }

      ApiResponse.success(res, { posts });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async getPostById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const post = await db.socialPost.findUnique({ where: { id: req.params.id } });
      if (!post) {
        ApiResponse.error(res, 'Post not found', 404);
        return;
      }
      ApiResponse.success(res, { post });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { mainCaption, mediaIds = [], targets = [], scheduledTime, publishNow } = req.body;

      const tags = (mainCaption.match(/#[a-zA-Z0-9_]+/g) || []).map((t: string) => t.slice(1));

      let initialStatus = 'DRAFT';
      if (publishNow) {
        initialStatus = 'PROCESSING';
      } else if (scheduledTime) {
        initialStatus = 'SCHEDULED';
      }

      const post = await db.socialPost.create({
        data: {
          mainCaption,
          status: initialStatus,
          scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : null,
          media: mediaIds,
          tags,
          targets: targets.map((t: any) => ({
            platform: t.platform,
            connectedAccountId: t.connectedAccountId || null,
            customCaption: t.customCaption || null,
            recipientPhone: t.recipientPhone || null,
            locationId: t.locationId || null,
            ctaType: t.ctaType || null,
            ctaUrl: t.ctaUrl || null,
            status: publishNow ? 'PROCESSING' : scheduledTime ? 'SCHEDULED' : 'PENDING',
            scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : null,
          })),
        },
      });

      await db.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'POST_CREATED',
          resourceType: 'POST',
          resourceId: post.id,
          details: { status: initialStatus, platforms: targets.map((t: any) => t.platform) },
        },
      });

      if (publishNow) {
        const publishedPost = await publishingService.publishPost(post.id);
        ApiResponse.created(res, { post: publishedPost }, 'Post published');
        return;
      } else if (scheduledTime) {
        await schedulePostJob(post.id, scheduledTime);
      }

      ApiResponse.created(res, { post }, 'Post created successfully');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async updatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await db.socialPost.update({
        where: { id },
        data: updates,
      });
      ApiResponse.success(res, { post: updated }, 'Post updated successfully');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await db.socialPost.delete({ where: { id: req.params.id } });
      ApiResponse.success(res, null, 'Post deleted successfully');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async publishNow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const post = await db.socialPost.findUnique({ where: { id: req.params.id } });
      if (!post) {
        ApiResponse.error(res, 'Post not found', 404);
        return;
      }
      const result = await publishingService.publishPost(post.id);
      ApiResponse.success(res, { post: result }, 'Publishing initiated');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async schedulePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { scheduledTime } = req.body;
      const post = await db.socialPost.findUnique({ where: { id: req.params.id } });
      if (!post) {
        ApiResponse.error(res, 'Post not found', 404);
        return;
      }

      await db.socialPost.update({
        where: { id: post.id },
        data: {
          status: 'SCHEDULED',
          scheduledTime: new Date(scheduledTime).toISOString(),
        },
      });

      await schedulePostJob(post.id, scheduledTime);
      ApiResponse.success(res, null, 'Post scheduled successfully');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async cancelScheduledPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const post = await db.socialPost.findUnique({ where: { id: req.params.id } });
      if (!post) {
        ApiResponse.error(res, 'Post not found', 404);
        return;
      }

      await cancelScheduledJob(post.id);
      await db.socialPost.update({
        where: { id: post.id },
        data: { status: 'CANCELLED' },
      });

      ApiResponse.success(res, null, 'Scheduled post cancelled');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async retryFailedPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const post = await db.socialPost.findUnique({ where: { id: req.params.id } });
      if (!post) {
        ApiResponse.error(res, 'Post not found', 404);
        return;
      }

      for (const t of post.targets) {
        if (t.status === 'FAILED') {
          await db.postTarget.update({
            where: { id: t.id },
            data: { status: 'PENDING', lastErrorCode: null, lastErrorMessage: null },
          });
        }
      }

      const updated = await publishingService.publishPost(post.id);
      ApiResponse.success(res, { post: updated }, 'Retry initiated for failed platforms');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async previewPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { mainCaption = '', mediaIds = [], targets = [] } = req.body;

      const mediaAssets = await Promise.all(
        mediaIds.map((id: string) => db.mediaAsset.findUnique({ where: { id } }))
      );
      const validMedia = mediaAssets.filter(Boolean);

      const previews: Record<string, any> = {};

      for (const t of targets) {
        const platform = t.platform as PlatformType;
        const config = PLATFORM_CONFIGS[platform];
        const caption = t.customCaption || mainCaption;

        const errors: string[] = [];
        const warnings: string[] = [];

        if (caption.length > config.maxCharacters) {
          errors.push(`Caption exceeds maximum length of ${config.maxCharacters} characters.`);
        }

        if (validMedia.length > config.maxMediaItems) {
          errors.push(`Selected ${validMedia.length} media items, but ${config.name} allows at most ${config.maxMediaItems}.`);
        }

        const docItems = validMedia.filter((m: any) => m.mediaType === 'DOCUMENT');
        if (docItems.length > 0 && !config.supportsDocuments) {
          warnings.push(`${config.name} does not support document (PDF) attachments. The document will be excluded from this platform.`);
        }

        if (platform === 'WHATSAPP' && !t.recipientPhone) {
          errors.push('WhatsApp requires a destination recipient phone number.');
        }

        if (platform === 'GOOGLE_BUSINESS' && !t.locationId) {
          errors.push('Google Business Profile requires a selected location.');
        }

        previews[platform] = {
          platform,
          platformName: config.name,
          caption,
          media: validMedia,
          valid: errors.length === 0,
          errors,
          warnings,
        };
      }

      ApiResponse.success(res, { previews });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }
}

export const postsController = new PostsController();
