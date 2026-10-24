import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PlatformType, PublishResult } from '@socialhub/shared';
import { IPlatformService, PlatformAccountContext, PlatformPublishPayload } from './base-platform.service';
import { ENV } from '../../config/env';

export class LinkedInService implements IPlatformService {
  readonly platform: PlatformType = 'LINKEDIN';

  validate(payload: PlatformPublishPayload, context: PlatformAccountContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.caption || payload.caption.trim().length === 0) {
      if (payload.media.length === 0) {
        errors.push('LinkedIn requires either text content or at least one media asset.');
      }
    }

    if (payload.caption && payload.caption.length > 3000) {
      errors.push(`LinkedIn caption exceeds 3,000 characters (current: ${payload.caption.length}).`);
    }

    if (payload.media.length > 9) {
      errors.push('LinkedIn supports a maximum of 9 images per post.');
    }

    const videoCount = payload.media.filter((m) => m.mediaType === 'VIDEO').length;
    if (videoCount > 1) {
      errors.push('LinkedIn only allows 1 video per post.');
    }

    const docCount = payload.media.filter((m) => m.mediaType === 'DOCUMENT').length;
    if (docCount > 1) {
      errors.push('LinkedIn only allows 1 document (PDF) per post.');
    }

    if (docCount > 0 && (videoCount > 0 || payload.media.length > 1)) {
      errors.push('LinkedIn cannot combine documents with images or videos in the same post.');
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

    // Verify token exists and is not empty
    if (!context.accessToken || context.accessToken.trim() === '' || context.accessToken.startsWith('mock_')) {
      return {
        success: false,
        platform: this.platform,
        errorCode: 'REAL_TOKEN_REQUIRED',
        errorMessage:
          'Your real LinkedIn account is not yet connected with a live access token. Please go to Connected Accounts and click "Connect LinkedIn" or enter your LinkedIn Access Token.',
      };
    }

    let authorUrn = context.externalId?.trim() || '';

    // If authorUrn is invalid, placeholder, or 'me', fall back to ENV.LINKEDIN_AUTHOR_URN
    if (!authorUrn || authorUrn === 'urn:li:person:me' || authorUrn === 'me' || authorUrn.startsWith('mock_')) {
      if (ENV.LINKEDIN_AUTHOR_URN && ENV.LINKEDIN_AUTHOR_URN.trim() !== '') {
        authorUrn = ENV.LINKEDIN_AUTHOR_URN.trim();
      }
    }

    if (authorUrn && !authorUrn.startsWith('urn:li:')) {
      authorUrn = `urn:li:person:${authorUrn}`;
    }

    if (!authorUrn || authorUrn === 'urn:li:person:me' || authorUrn === 'me') {
      return {
        success: false,
        platform: this.platform,
        errorCode: 'AUTHOR_URN_REQUIRED',
        errorMessage:
          'LinkedIn requires a valid Person or Organization author ID (e.g. urn:li:person:12345678 or urn:li:organization:12345678). ' +
          'Either add "Sign In with LinkedIn using OpenID Connect" in your LinkedIn Developer Portal (under Products tab) to auto-detect your ID, ' +
          'or configure LINKEDIN_AUTHOR_URN in your .env file.',
      };
    }

    // Attempt 1: Official LinkedIn REST Posts API (LinkedIn-Version: 202511)
    try {
      const postBody: any = {
        author: authorUrn,
        commentary: payload.caption,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      };

      // Upload image if present
      if (payload.media.length > 0 && payload.media[0].mediaType === 'IMAGE') {
        try {
          const initRes = await axios.post(
            'https://api.linkedin.com/rest/images?action=initializeUpload',
            { initializeUploadRequest: { owner: authorUrn } },
            {
              headers: {
                Authorization: `Bearer ${context.accessToken}`,
                'LinkedIn-Version': '202511',
                'X-Restli-Protocol-Version': '2.0.0',
              },
            }
          );
          const imageUrn = initRes.data?.value?.image;
          const uploadUrl = initRes.data?.value?.uploadUrl;

          if (imageUrn && uploadUrl) {
            let imageBuffer: Buffer | null = null;
            const mediaUrl = payload.media[0].url;

            if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
              const imgRes = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
              imageBuffer = Buffer.from(imgRes.data);
            } else if (fs.existsSync(mediaUrl)) {
              imageBuffer = fs.readFileSync(mediaUrl);
            } else {
              const localPath = path.resolve(ENV.UPLOAD_DIR, path.basename(mediaUrl));
              if (fs.existsSync(localPath)) {
                imageBuffer = fs.readFileSync(localPath);
              }
            }

            if (imageBuffer) {
              await axios.put(uploadUrl, imageBuffer, {
                headers: {
                  Authorization: `Bearer ${context.accessToken}`,
                  'Content-Type': 'application/octet-stream',
                },
              });

              postBody.content = {
                media: {
                  title: payload.caption.slice(0, 100) || 'Image post',
                  id: imageUrn,
                },
              };
            }
          }
        } catch (mediaErr: any) {
          console.warn('LinkedIn REST image initialization failed, posting commentary:', mediaErr.response?.data || mediaErr.message);
        }
      }

      const response = await axios.post('https://api.linkedin.com/rest/posts', postBody, {
        headers: {
          Authorization: `Bearer ${context.accessToken}`,
          'LinkedIn-Version': '202511',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      const postId = response.headers['x-restli-id'] || response.data?.id;
      return {
        success: true,
        platform: this.platform,
        remotePostId: postId,
        publishedUrl: `https://www.linkedin.com/feed/update/${postId}`,
        rawResponse: response.data,
      };
    } catch (restErr: any) {
      console.warn('LinkedIn REST Posts API error, attempting fallback to UGC Posts API:', restErr.response?.data || restErr.message);

      // Attempt 2: Official LinkedIn UGC Posts API (v2)
      try {
        const ugcBody = {
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: payload.caption,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        };

        const ugcRes = await axios.post('https://api.linkedin.com/v2/ugcPosts', ugcBody, {
          headers: {
            Authorization: `Bearer ${context.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          },
        });

        const ugcPostId = ugcRes.data?.id;
        return {
          success: true,
          platform: this.platform,
          remotePostId: ugcPostId,
          publishedUrl: `https://www.linkedin.com/feed/update/${ugcPostId}`,
          rawResponse: ugcRes.data,
        };
      } catch (ugcErr: any) {
        const errData = ugcErr.response?.data || restErr.response?.data;
        const errMsg = errData?.message || ugcErr.message || restErr.message || 'LinkedIn publish request failed';
        console.error('LinkedIn Publish Final Error:', errData || errMsg);

        return {
          success: false,
          platform: this.platform,
          errorCode: errData?.status ? `HTTP_${errData.status}` : 'API_ERROR',
          errorMessage: errMsg,
          rawResponse: errData,
        };
      }
    }
  }

  async testConnection(context: PlatformAccountContext): Promise<{ success: boolean; message: string; details?: any }> {
    if (!context.accessToken || context.accessToken.startsWith('mock_')) {
      return {
        success: false,
        message: 'No live LinkedIn access token configured. Please connect your real LinkedIn account.',
      };
    }

    const { verifyLinkedInToken } = await import('./linkedin-auth.service');
    const result = await verifyLinkedInToken(context.accessToken);

    if (!result.valid) {
      return {
        success: false,
        message: result.errorMessage || 'LinkedIn token verification failed.',
        details: { errorCode: result.errorCode, scopes: result.scopes },
      };
    }

    let successMsg = `Verified active LinkedIn token with publishing scope ('w_member_social').`;
    if (result.profile?.name) {
      successMsg += ` Account: ${result.profile.name}`;
    } else if (result.warning) {
      successMsg += ` Note: Profile details skipped (token lacks OpenID Connect scopes).`;
    }

    return {
      success: true,
      message: successMsg,
      details: {
        active: result.active,
        scopes: result.scopes,
        profile: result.profile,
        warning: result.warning,
      },
    };
  }
}
