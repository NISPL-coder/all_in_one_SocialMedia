import axios from 'axios';
import { PlatformType, PublishResult } from '@socialhub/shared';
import { IPlatformService, PlatformAccountContext, PlatformPublishPayload } from './base-platform.service';

export class GoogleBusinessService implements IPlatformService {
  readonly platform: PlatformType = 'GOOGLE_BUSINESS';

  validate(payload: PlatformPublishPayload, context: PlatformAccountContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const locationId = payload.locationId || context.externalId;
    if (!locationId) {
      errors.push('Google Business Profile requires a designated location ID.');
    }

    if (!payload.caption || payload.caption.trim().length === 0) {
      errors.push('Google Business Profile requires post text summary.');
    }

    if (payload.caption && payload.caption.length > 1500) {
      errors.push(`Google Business Profile update exceeds the 1,500 character limit (current: ${payload.caption.length}).`);
    }

    const docMedia = payload.media.filter(m => m.mediaType === 'DOCUMENT');
    if (docMedia.length > 0) {
      errors.push('Google Business Profile does not support PDF or document uploads.');
    }

    const videoMedia = payload.media.filter(m => m.mediaType === 'VIDEO');
    if (videoMedia.length > 0) {
      errors.push('Google Business Profile Local Posts support image media only.');
    }

    if (payload.media.length > 1) {
      errors.push('Google Business Profile supports 1 primary image per local update.');
    }

    if (payload.ctaType && payload.ctaType !== 'CALL' && (!payload.ctaUrl || !payload.ctaUrl.startsWith('http'))) {
      errors.push('A valid destination URL (http:// or https://) is required when a Call to Action button is selected.');
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

    const location = payload.locationId || context.externalId;
    const isMock = context.accessToken.startsWith('mock_') || !context.accessToken;

    if (isMock) {
      const mockPostId = `localPosts/${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      return {
        success: true,
        platform: this.platform,
        remotePostId: mockPostId,
        publishedUrl: `https://business.google.com/posts/l/${location.replace('locations/', '')}`,
        rawResponse: {
          name: `${location}/${mockPostId}`,
          state: 'LIVE',
          summary: payload.caption,
        },
      };
    }

    try {
      const localPostBody: any = {
        languageCode: 'en-US',
        summary: payload.caption,
        topicType: 'STANDARD',
      };

      if (payload.media.length > 0) {
        localPostBody.media = [
          {
            mediaFormat: 'PHOTO',
            sourceUrl: payload.media[0].url,
          },
        ];
      }

      if (payload.ctaType && payload.ctaType !== 'NONE') {
        localPostBody.callToAction = {
          actionType: payload.ctaType, // e.g. LEARN_MORE, BOOK, ORDER, SHOP, SIGN_UP, CALL
          url: payload.ctaUrl,
        };
      }

      const response = await axios.post(
        `https://mybusiness.googleapis.com/v4/${location}/localPosts`,
        localPostBody,
        {
          headers: {
            Authorization: `Bearer ${context.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const postName = response.data?.name;
      return {
        success: true,
        platform: this.platform,
        remotePostId: postName,
        publishedUrl: `https://business.google.com/posts/l/${location.replace('locations/', '')}`,
        rawResponse: response.data,
      };
    } catch (err: any) {
      console.error('Google Business Profile Publish Error:', err.response?.data || err.message);
      const googleError = err.response?.data?.error;
      return {
        success: false,
        platform: this.platform,
        errorCode: googleError?.status || 'API_ERROR',
        errorMessage: googleError?.message || err.message || 'Google Business Profile publishing failed.',
        rawResponse: err.response?.data,
      };
    }
  }

  async testConnection(context: PlatformAccountContext): Promise<{ success: boolean; message: string; details?: any }> {
    if (context.accessToken.startsWith('mock_')) {
      return {
        success: true,
        message: 'Google Business Profile account verified. Business location is verified and active.',
        details: { locationId: context.externalId, locationName: context.accountName },
      };
    }

    try {
      const res = await axios.get(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${context.externalId}?readMask=name,title,storefrontAddress`,
        {
          headers: { Authorization: `Bearer ${context.accessToken}` },
        }
      );
      return {
        success: true,
        message: 'Google Business Profile location verified.',
        details: res.data,
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.error?.message || e.message || 'Google Business Profile location test failed.',
      };
    }
  }
}
