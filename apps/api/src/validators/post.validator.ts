import { z } from 'zod';

const platformEnum = z.enum(['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'GOOGLE_BUSINESS']);

export const targetInputSchema = z.object({
  platform: platformEnum,
  connectedAccountId: z.string().optional(),
  customCaption: z.string().optional(),
  recipientPhone: z.string().optional(),
  locationId: z.string().optional(),
  ctaType: z.string().optional(),
  ctaUrl: z.string().url('CTA URL must be a valid http or https URL').optional().or(z.literal('')),
});

export const createPostSchema = z.object({
  body: z.object({
    mainCaption: z.string().default(''),
    mediaIds: z.array(z.string()).default([]),
    targets: z.array(targetInputSchema).min(1, 'At least one target platform must be selected'),
    scheduledTime: z.string().datetime().nullable().optional(),
    publishNow: z.boolean().default(false),
  }).refine((data) => data.mainCaption.trim().length > 0 || data.mediaIds.length > 0, {
    message: 'Post must contain either a text caption or at least one media asset.',
    path: ['mainCaption'],
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    mainCaption: z.string().optional(),
    mediaIds: z.array(z.string()).optional(),
    targets: z.array(targetInputSchema).optional(),
    scheduledTime: z.string().datetime().nullable().optional(),
  }),
});

export const schedulePostSchema = z.object({
  body: z.object({
    scheduledTime: z.string().datetime('A valid ISO-8601 datetime is required (e.g. 2026-10-24T10:00:00Z)'),
  }),
});

export const previewPostSchema = z.object({
  body: z.object({
    mainCaption: z.string().default(''),
    mediaIds: z.array(z.string()).default([]),
    targets: z.array(targetInputSchema).default([]),
  }),
});
