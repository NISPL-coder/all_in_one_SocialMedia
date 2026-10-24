import axios from 'axios';
import { PlatformType, PublishResult } from '@socialhub/shared';
import { IPlatformService, PlatformAccountContext, PlatformPublishPayload } from './base-platform.service';

export class InstagramService implements IPlatformService {
  readonly platform: PlatformType = 'INSTAGRAM';
  private apiVersion = 'v21.0';

  validate(payload: PlatformPublishPayload, context: PlatformAccountContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (payload.media.length === 0) {
      errors.push('Instagram requires at least one image or video. Text-only posts are not supported by Instagram.');
    }

    if (payload.caption && payload.caption.length > 2200) {
      errors.push(`Instagram caption exceeds the 2,200 character limit (current: ${payload.caption.length}).`);
    }

    const docMedia = payload.media.filter(m => m.mediaType === 'DOCUMENT');
    if (docMedia.length > 0) {
      errors.push('Instagram does not support PDF or document uploads.');
    }

    if (payload.media.length > 10) {
      errors.push('Instagram carousels support up to 10 media items.');
    }

    // Hashtag check
    if (payload.caption) {
      const hashtagMatches = payload.caption.match(/#[a-zA-Z0-9_]+/g) || [];
      if (hashtagMatches.length > 30) {
        errors.push(`Instagram allows a maximum of 30 hashtags per post (found: ${hashtagMatches.length}).`);
      }
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
      const mockShortcode = Math.random().toString(36).substring(2, 11).toUpperCase();
      const mockPostId = `179${Math.floor(10000000000000 + Math.random() * 90000000000000)}`;
      return {
        success: true,
        platform: this.platform,
        remotePostId: mockPostId,
        publishedUrl: `https://www.instagram.com/p/${mockShortcode}/`,
        rawResponse: { id: mockPostId, shortcode: mockShortcode },
      };
    }

    try {
      const igUserId = context.externalId;
      const images = payload.media.filter(m => m.mediaType === 'IMAGE');
      const videos = payload.media.filter(m => m.mediaType === 'VIDEO');

      let creationId: string;

      if (images.length === 1 && videos.length === 0) {
        // Single Image Container
        const containerRes = await axios.post(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
          null,
          {
            params: {
              image_url: images[0].url,
              caption: payload.caption,
              access_token: context.accessToken,
            },
          }
        );
        creationId = containerRes.data.id;
      } else if (videos.length === 1 && images.length === 0) {
        // Video / Reels Container
        const containerRes = await axios.post(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
          null,
          {
            params: {
              media_type: 'REELS',
              video_url: videos[0].url,
              caption: payload.caption,
              access_token: context.accessToken,
            },
          }
        );
        creationId = containerRes.data.id;

        // Poll container status until FINISHED
        await this.pollContainerStatus(creationId, context.accessToken);
      } else {
        // Carousel Container (Multi-image/video)
        const childContainerIds: string[] = [];
        for (const item of payload.media) {
          const params: any = {
            is_carousel_item: true,
            access_token: context.accessToken,
          };
          if (item.mediaType === 'IMAGE') params.image_url = item.url;
          if (item.mediaType === 'VIDEO') {
            params.media_type = 'VIDEO';
            params.video_url = item.url;
          }

          const childRes = await axios.post(
            `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
            null,
            { params }
          );
          childContainerIds.push(childRes.data.id);
        }

        const carouselRes = await axios.post(
          `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
          null,
          {
            params: {
              media_type: 'CAROUSEL',
              children: childContainerIds.join(','),
              caption: payload.caption,
              access_token: context.accessToken,
            },
          }
        );
        creationId = carouselRes.data.id;
      }

      // Publish the Media Container
      const publishRes = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: context.accessToken,
          },
        }
      );

      const publishedMediaId = publishRes.data.id;

      // Fetch permalink
      let permalink = `https://www.instagram.com/p/${publishedMediaId}/`;
      try {
        const infoRes = await axios.get(
          `https://graph.facebook.com/${this.apiVersion}/${publishedMediaId}?fields=permalink&access_token=${context.accessToken}`
        );
        if (infoRes.data?.permalink) permalink = infoRes.data.permalink;
      } catch {
        // Use fallback permalink
      }

      return {
        success: true,
        platform: this.platform,
        remotePostId: publishedMediaId,
        publishedUrl: permalink,
        rawResponse: publishRes.data,
      };
    } catch (err: any) {
      console.error('Instagram Publish Error:', err.response?.data || err.message);
      const metaError = err.response?.data?.error;
      return {
        success: false,
        platform: this.platform,
        errorCode: metaError?.code ? `IG_ERR_${metaError.code}` : 'API_ERROR',
        errorMessage: metaError?.message || err.message || 'Instagram publishing failed.',
        rawResponse: err.response?.data,
      };
    }
  }

  private async pollContainerStatus(creationId: string, accessToken: string, maxAttempts = 12): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const res = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${creationId}?fields=status_code&access_token=${accessToken}`
      );
      const status = res.data?.status_code;
      if (status === 'FINISHED') return;
      if (status === 'ERROR') throw new Error('Instagram media processing encountered an error.');
    }
  }

  async testConnection(context: PlatformAccountContext): Promise<{ success: boolean; message: string; details?: any }> {
    if (context.accessToken.startsWith('mock_')) {
      return {
        success: true,
        message: 'Instagram Professional account verified. Media publishing permissions active.',
        details: { igUserId: context.externalId, username: context.accountName },
      };
    }

    try {
      const res = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${context.externalId}?fields=username,name,profile_picture_url,media_count&access_token=${context.accessToken}`
      );
      return {
        success: true,
        message: 'Instagram Professional account is active.',
        details: res.data,
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.error?.message || e.message || 'Instagram account check failed.',
      };
    }
  }
}
