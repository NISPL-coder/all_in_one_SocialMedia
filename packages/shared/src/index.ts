export type PlatformType =
  | 'LINKEDIN'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'GOOGLE_BUSINESS';

export type PostStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'PUBLISHED'
  | 'PARTIALLY_PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export type TargetPublishStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  badge: string;
  maxCharacters: number;
  maxMediaItems: number;
  allowedMediaTypes: MediaType[];
  supportsDocuments: boolean;
  supportsHashtags: boolean;
  supportsCustomCTA: boolean;
  requiresRecipient: boolean;
  requiresLocation: boolean;
  mediaConstraints: {
    maxImageSizeMB: number;
    maxVideoSizeMB: number;
    maxDocSizeMB: number;
    supportedImageFormats: string[];
    supportedVideoFormats: string[];
    supportedDocFormats: string[];
    aspectRatios?: string[];
  };
}

export const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig> = {
  LINKEDIN: {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    badge: 'Member & Company Pages',
    maxCharacters: 3000,
    maxMediaItems: 9,
    allowedMediaTypes: ['IMAGE', 'VIDEO', 'DOCUMENT'],
    supportsDocuments: true,
    supportsHashtags: true,
    supportsCustomCTA: false,
    requiresRecipient: false,
    requiresLocation: false,
    mediaConstraints: {
      maxImageSizeMB: 8,
      maxVideoSizeMB: 200,
      maxDocSizeMB: 100,
      supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif'],
      supportedVideoFormats: ['video/mp4', 'video/webm'],
      supportedDocFormats: ['application/pdf'],
    },
  },
  FACEBOOK: {
    id: 'FACEBOOK',
    name: 'Facebook Pages',
    badge: 'Meta Graph API',
    maxCharacters: 63206,
    maxMediaItems: 10,
    allowedMediaTypes: ['IMAGE', 'VIDEO'],
    supportsDocuments: false,
    supportsHashtags: true,
    supportsCustomCTA: false,
    requiresRecipient: false,
    requiresLocation: false,
    mediaConstraints: {
      maxImageSizeMB: 10,
      maxVideoSizeMB: 500,
      maxDocSizeMB: 0,
      supportedImageFormats: ['image/jpeg', 'image/png', 'image/webp'],
      supportedVideoFormats: ['video/mp4', 'video/quicktime'],
      supportedDocFormats: [],
    },
  },
  INSTAGRAM: {
    id: 'INSTAGRAM',
    name: 'Instagram',
    badge: 'Professional / Creator',
    maxCharacters: 2200,
    maxMediaItems: 10,
    allowedMediaTypes: ['IMAGE', 'VIDEO'],
    supportsDocuments: false,
    supportsHashtags: true,
    supportsCustomCTA: false,
    requiresRecipient: false,
    requiresLocation: false,
    mediaConstraints: {
      maxImageSizeMB: 8,
      maxVideoSizeMB: 100,
      maxDocSizeMB: 0,
      supportedImageFormats: ['image/jpeg', 'image/png'],
      supportedVideoFormats: ['video/mp4', 'video/quicktime'],
      supportedDocFormats: [],
      aspectRatios: ['1:1 (Square)', '4:5 (Portrait)', '1.91:1 (Landscape)'],
    },
  },
  GOOGLE_BUSINESS: {
    id: 'GOOGLE_BUSINESS',
    name: 'Google Business Profile',
    badge: 'Local Posts & Updates',
    maxCharacters: 1500,
    maxMediaItems: 1,
    allowedMediaTypes: ['IMAGE'],
    supportsDocuments: false,
    supportsHashtags: false,
    supportsCustomCTA: true,
    requiresRecipient: false,
    requiresLocation: true,
    mediaConstraints: {
      maxImageSizeMB: 10,
      maxVideoSizeMB: 0,
      maxDocSizeMB: 0,
      supportedImageFormats: ['image/jpeg', 'image/png'],
      supportedVideoFormats: [],
      supportedDocFormats: [],
    },
  },
};

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  timezone: string;
  createdAt: string;
}

export interface ConnectedAccountDTO {
  id: string;
  platform: PlatformType;
  accountName: string;
  accountType: string;
  avatarUrl?: string;
  externalId: string;
  status: 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'DISCONNECTED';
  expiresAt?: string;
  tokenExpiresAt?: string;
  scopes: string[];
  metadata?: Record<string, any>;
  isConfigured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAssetDTO {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: MediaType;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: string;
}

export interface PostTargetDTO {
  id: string;
  platform: PlatformType;
  connectedAccountId?: string;
  connectedAccount?: ConnectedAccountDTO;
  customCaption?: string;
  status: TargetPublishStatus;
  scheduledTime?: string;
  publishedAt?: string;
  remotePostId?: string;
  publishedUrl?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  recipientPhone?: string;
  locationId?: string;
  ctaType?: string;
  ctaUrl?: string;
  attemptsCount: number;
}

export interface SocialPostDTO {
  id: string;
  mainCaption: string;
  status: PostStatus;
  scheduledTime?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  media: MediaAssetDTO[];
  targets: PostTargetDTO[];
  tags: string[];
}

export interface CreatePostRequest {
  mainCaption: string;
  mediaIds: string[];
  scheduledTime?: string | null;
  publishNow?: boolean;
  targets: {
    platform: PlatformType;
    connectedAccountId?: string;
    customCaption?: string;
    recipientPhone?: string;
    locationId?: string;
    ctaType?: string;
    ctaUrl?: string;
  }[];
}

export interface UpdatePostRequest {
  mainCaption?: string;
  mediaIds?: string[];
  scheduledTime?: string | null;
  targets?: {
    platform: PlatformType;
    connectedAccountId?: string;
    customCaption?: string;
    recipientPhone?: string;
    locationId?: string;
    ctaType?: string;
    ctaUrl?: string;
  }[];
}

export interface DashboardSummaryDTO {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  failedPosts: number;
  connectedAccountsCount: number;
  platformStats: Record<PlatformType, {
    published: number;
    scheduled: number;
    failed: number;
    connected: boolean;
  }>;
}

export interface PublishResult {
  success: boolean;
  platform: PlatformType;
  remotePostId?: string;
  publishedUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: Record<string, any>;
}

export interface AICaptionRequest {
  prompt: string;
  tone?: 'professional' | 'engaging' | 'casual' | 'promotional' | 'informative';
  platforms?: PlatformType[];
  includeHashtags?: boolean;
  includeEmojis?: boolean;
}

export interface AICaptionResponse {
  caption: string;
  hashtags: string[];
  platformVariations: Record<PlatformType, string>;
  headlineSuggestions: string[];
}
