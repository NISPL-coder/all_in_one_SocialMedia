import axios from 'axios';
import { PlatformType, PublishResult } from '@socialhub/shared';
import { IPlatformService, PlatformAccountContext, PlatformPublishPayload } from './base-platform.service';

export class WhatsAppService implements IPlatformService {
  readonly platform: PlatformType = 'WHATSAPP';
  private apiVersion = 'v21.0';

  validate(payload: PlatformPublishPayload, context: PlatformAccountContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.recipientPhone || payload.recipientPhone.trim().length === 0) {
      errors.push('WhatsApp requires a designated recipient phone number (with country code, e.g. +15551234567).');
    } else {
      const cleaned = payload.recipientPhone.replace(/[^0-9]/g, '');
      if (cleaned.length < 8 || cleaned.length > 15) {
        errors.push('Recipient phone number must be a valid E.164 international phone number.');
      }
    }

    if (!payload.caption && payload.media.length === 0) {
      errors.push('WhatsApp message cannot be empty. Text or media is required.');
    }

    if (payload.caption && payload.caption.length > 4096) {
      errors.push(`WhatsApp text exceeds the 4,096 character limit (current: ${payload.caption.length}).`);
    }

    if (payload.media.length > 1) {
      errors.push('WhatsApp messages support sending 1 media asset per API message request.');
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
    const recipient = payload.recipientPhone?.replace(/[^0-9]/g, '') || '';

    if (isMock) {
      const mockMsgId = `wamid.HBgL${Math.random().toString(36).substring(2, 10).toUpperCase()}==`;
      return {
        success: true,
        platform: this.platform,
        remotePostId: mockMsgId,
        publishedUrl: `https://wa.me/${recipient}`,
        rawResponse: {
          messaging_product: 'whatsapp',
          contacts: [{ input: recipient, wa_id: recipient }],
          messages: [{ id: mockMsgId }],
        },
      };
    }

    try {
      const phoneNumberId = context.externalId;
      const mediaItem = payload.media[0];
      let requestBody: any;

      if (mediaItem) {
        if (mediaItem.mediaType === 'IMAGE') {
          requestBody = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipient,
            type: 'image',
            image: {
              link: mediaItem.url,
              caption: payload.caption || undefined,
            },
          };
        } else if (mediaItem.mediaType === 'VIDEO') {
          requestBody = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipient,
            type: 'video',
            video: {
              link: mediaItem.url,
              caption: payload.caption || undefined,
            },
          };
        } else if (mediaItem.mediaType === 'DOCUMENT') {
          requestBody = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipient,
            type: 'document',
            document: {
              link: mediaItem.url,
              caption: payload.caption || undefined,
              filename: mediaItem.fileName || 'document.pdf',
            },
          };
        }
      } else {
        requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: {
            preview_url: true,
            body: payload.caption,
          },
        };
      }

      const response = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${context.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const msgId = response.data?.messages?.[0]?.id;
      return {
        success: true,
        platform: this.platform,
        remotePostId: msgId,
        publishedUrl: `https://wa.me/${recipient}`,
        rawResponse: response.data,
      };
    } catch (err: any) {
      console.error('WhatsApp Publish Error:', err.response?.data || err.message);
      const metaError = err.response?.data?.error;
      return {
        success: false,
        platform: this.platform,
        errorCode: metaError?.code ? `WABA_${metaError.code}` : 'API_ERROR',
        errorMessage: metaError?.message || err.message || 'WhatsApp message distribution failed.',
        rawResponse: err.response?.data,
      };
    }
  }

  async testConnection(context: PlatformAccountContext): Promise<{ success: boolean; message: string; details?: any }> {
    if (context.accessToken.startsWith('mock_')) {
      return {
        success: true,
        message: 'WhatsApp Business Cloud API connection active. Phone ID verified.',
        details: { phoneNumberId: context.externalId, accountName: context.accountName },
      };
    }

    try {
      const res = await axios.get(
        `https://graph.facebook.com/${this.apiVersion}/${context.externalId}?fields=verified_name,display_phone_number,quality_rating`,
        {
          headers: { Authorization: `Bearer ${context.accessToken}` },
        }
      );
      return {
        success: true,
        message: 'WhatsApp Business Phone Number verified and active.',
        details: res.data,
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.error?.message || e.message || 'WhatsApp connection test failed.',
      };
    }
  }
}
