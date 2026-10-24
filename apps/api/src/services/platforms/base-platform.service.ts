import { PlatformType, PublishResult } from '@socialhub/shared';

export interface PlatformPublishPayload {
  caption: string;
  media: {
    id: string;
    url: string;
    mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    mimeType: string;
    fileName: string;
  }[];
  recipientPhone?: string;
  locationId?: string;
  ctaType?: string;
  ctaUrl?: string;
}

export interface PlatformAccountContext {
  id: string;
  platform: PlatformType;
  externalId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  metadata?: Record<string, any>;
}

export interface IPlatformService {
  readonly platform: PlatformType;
  validate(payload: PlatformPublishPayload, context: PlatformAccountContext): { valid: boolean; errors: string[] };
  publish(payload: PlatformPublishPayload, context: PlatformAccountContext): Promise<PublishResult>;
  testConnection(context: PlatformAccountContext): Promise<{ success: boolean; message: string; details?: any }>;
}
