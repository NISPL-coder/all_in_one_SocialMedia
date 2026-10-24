import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PlatformType, PublishResult } from '@socialhub/shared';
import { IPlatformService, PlatformAccountContext, PlatformPublishPayload } from './base-platform.service';
import { ENV } from '../../config/env';

export class FacebookService implements IPlatformService {
  readonly platform: PlatformType = 'FACEBOOK';
  private apiVersion = 'v21.0';

  private getMediaFile(mediaItem: any): { buffer?: Buffer; filename: string; mimeType: string } | null {
    const filename = path.basename(mediaItem.url);
    const localPath = path.resolve(ENV.UPLOAD_DIR, filename);
    if (fs.existsSync(localPath)) {
      return {
        buffer: fs.readFileSync(localPath),
        filename,
        mimeType:
          mediaItem.mimeType ||
          (filename.endsWith('.png')
            ? 'image/png'
            : filename.endsWith('.webp')
            ? 'image/webp'
            : filename.endsWith('.mp4')
            ? 'video/mp4'
            : 'image/jpeg'),
      };
    }
    return null;
  }

  private async uploadPhoto(
    pageId: string,
    accessToken: string,
    mediaItem: any,
    caption?: string,
    published = true
  ): Promise<any> {
    const local = this.getMediaFile(mediaItem);
    if (local?.buffer) {
      const form = new FormData();
      const blob = new Blob([new Uint8Array(local.buffer)], { type: local.mimeType });
      form.append('source', blob, local.filename);
      form.append('access_token', accessToken);
      if (caption) form.append('caption', caption);
      if (!published) form.append('published', 'false');

      const res = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${pageId}/photos`, form);
      return res.data;
    } else {
      const res = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${pageId}/photos`, {
        caption: caption || undefined,
        url: mediaItem.url,
        published: published ? undefined : false,
        access_token: accessToken,
      });
      return res.data;
    }
  }

  private async uploadVideo(
    pageId: string,
    accessToken: string,
    mediaItem: any,
    description?: string
  ): Promise<any> {
    const local = this.getMediaFile(mediaItem);
    if (local?.buffer) {
      const form = new FormData();
      const blob = new Blob([new Uint8Array(local.buffer)], { type: local.mimeType || 'video/mp4' });
      form.append('source', blob, local.filename);
      form.append('access_token', accessToken);
      if (description) form.append('description', description);

      const res = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${pageId}/videos`, form);
      return res.data;
    } else {
      const res = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${pageId}/videos`, {
        description,
        file_url: mediaItem.url,
        access_token: accessToken,
      });
      return res.data;
    }
  }

  validate(payload: PlatformPublishPayload, context: PlatformAccountContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.caption && payload.media.length === 0) {
      errors.push('Facebook requires either text or at least one image or video.');
    }

    if (payload.caption && payload.caption.length > 63206) {
      errors.push('Facebook caption exceeds the 63,206 character limit.');
    }

    const docMedia = payload.media.filter(m => m.mediaType === 'DOCUMENT');
    if (docMedia.length > 0) {
      errors.push('Facebook Pages do not support direct PDF or document feed publishing. Upload an image or share a link instead.');
    }

    if (payload.media.length > 10) {
      errors.push('Facebook allows up to 10 photos in a single multi-photo post.');
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(payload: PlatformPublishPayload, context: PlatformAccountContext): Promise<PublishResult> {
    const validation = this.validate(payload, context);
    if (!validation.valid) {
      return {
        success: false,
        platform: this.platform,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: validation.errors.join('; '),
      };
    }

    const isMock = context.accessToken.startsWith('mock_') || !context.accessToken;

    if (isMock) {
      const mockPostId = `${context.externalId}_${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      return {
        success: true,
        platform: this.platform,
        remotePostId: mockPostId,
        publishedUrl: `https://www.facebook.com/${mockPostId.replace('_', '/posts/')}`,
        rawResponse: { id: mockPostId, status: 'SUCCESS' },
      };
    }

    try {
      const pageId = context.externalId;
      const images = payload.media.filter(m => m.mediaType === 'IMAGE');
      const videos = payload.media.filter(m => m.mediaType === 'VIDEO');

      let response: any;

      if (videos.length > 0) {
        // Video publishing
        const vidRes = await this.uploadVideo(pageId, context.accessToken, videos[0], payload.caption);
        response = { data: vidRes };
      } else if (images.length === 1) {
        // Single photo publishing
        const photoRes = await this.uploadPhoto(pageId, context.accessToken, images[0], payload.caption, true);
        response = { data: photoRes };
      } else if (images.length > 1) {
        // Multi-photo publishing: upload unreleased photos then publish combined feed story
        const photoIds: string[] = [];
        for (const img of images) {
          const upRes = await this.uploadPhoto(pageId, context.accessToken, img, undefined, false);
          if (upRes?.id) photoIds.push(upRes.id);
        }

        const attachedMedia = photoIds.map(id => ({ media_fbid: id }));
        response = await axios.post(
          `https://graph.facebook.com/${this.apiVersion}/${pageId}/feed`,
          {
            message: payload.caption,
            attached_media: attachedMedia,
            access_token: context.accessToken,
          }
        );
      } else {
        // Text-only post
        response = await axios.post(
          `https://graph.facebook.com/${this.apiVersion}/${pageId}/feed`,
          {
            message: payload.caption,
            access_token: context.accessToken,
          }
        );
      }

      const postId = response.data?.post_id || response.data?.id;
      return {
        success: true,
        platform: this.platform,
        remotePostId: postId,
        publishedUrl: `https://www.facebook.com/${postId ? postId.replace('_', '/posts/') : pageId}`,
        rawResponse: response.data,
      };
    } catch (err: any) {
      console.error('Facebook Publish Error:', err.response?.data || err.message);
      const metaError = err.response?.data?.error;
      return {
        success: false,
        platform: this.platform,
        errorCode: metaError?.code ? `META_ERR_${metaError.code}` : 'API_ERROR',
        errorMessage: metaError?.message || err.message || 'Facebook Page publishing failed.',
        rawResponse: err.response?.data,
      };
    }
  }

  async testConnection(context: PlatformAccountContext): Promise<{ success: boolean; message: string; details?: any }> {
    if (context.accessToken.startsWith('mock_')) {
      return {
        success: true,
        message: 'Facebook Page connection verified. Page permissions active.',
        details: { pageId: context.externalId, name: context.accountName },
      };
    }

    try {
      const res = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${context.externalId}?fields=name,about,is_published,fan_count&access_token=${context.accessToken}`
      );
      return {
        success: true,
        message: 'Facebook Page token is valid and active.',
        details: res.data,
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.error?.message || e.message || 'Facebook token check failed.',
      };
    }
  }
}
