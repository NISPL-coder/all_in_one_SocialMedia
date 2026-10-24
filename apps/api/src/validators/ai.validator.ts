import { z } from 'zod';

export const aiGenerateSchema = z.object({
  body: z.object({
    prompt: z.string().min(3, 'Prompt must be at least 3 characters long'),
    tone: z.enum(['professional', 'engaging', 'casual', 'promotional', 'informative']).optional(),
    platforms: z.array(z.enum(['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'GOOGLE_BUSINESS'])).optional(),
    includeHashtags: z.boolean().optional(),
    includeEmojis: z.boolean().optional(),
  }),
});
