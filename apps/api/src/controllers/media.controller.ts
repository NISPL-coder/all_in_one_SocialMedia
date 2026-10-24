import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ENV } from '../config/env';
import { MediaType } from '@socialhub/shared';
import { ApiResponse } from '../utils/api-response';

export class MediaController {
  async getMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const media = await db.mediaAsset.findMany();
      ApiResponse.success(res, { media });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async uploadMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        ApiResponse.error(res, 'No file uploaded.', 400);
        return;
      }

      let mediaType: MediaType = 'IMAGE';
      if (file.mimetype.startsWith('video/')) {
        mediaType = 'VIDEO';
      } else if (file.mimetype.includes('pdf') || file.mimetype.includes('document')) {
        mediaType = 'DOCUMENT';
      }

      const publicUrl = `${ENV.STORAGE_PUBLIC_BASE_URL}/${file.filename}`;

      const mediaAsset = await db.mediaAsset.create({
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          mediaType,
          url: publicUrl,
          storageKey: file.filename,
          thumbnailUrl: mediaType === 'IMAGE' ? publicUrl : null,
        },
      });

      await db.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'MEDIA_UPLOADED',
          resourceType: 'MEDIA',
          resourceId: mediaAsset.id,
          details: { fileName: file.originalname, mediaType, size: file.size },
        },
      });

      ApiResponse.created(res, { media: mediaAsset }, 'File uploaded successfully');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async deleteMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const asset = await db.mediaAsset.findUnique({ where: { id: req.params.id } });
      if (!asset) {
        ApiResponse.error(res, 'Media asset not found.', 404);
        return;
      }

      const filePath = path.join(ENV.UPLOAD_DIR, asset.storageKey);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not remove file from disk:', e);
        }
      }

      await db.mediaAsset.delete({ where: { id: req.params.id } });
      ApiResponse.success(res, null, 'Media asset deleted successfully');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }
}

export const mediaController = new MediaController();
