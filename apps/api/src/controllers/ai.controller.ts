import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { aiService } from '../services/ai.service';
import { AICaptionRequest } from '@socialhub/shared';
import { ApiResponse } from '../utils/api-response';

export class AIController {
  async generateCaptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { prompt, tone, platforms, includeHashtags, includeEmojis } = req.body as AICaptionRequest;

      const result = await aiService.generateCaptions({
        prompt,
        tone,
        platforms,
        includeHashtags,
        includeEmojis,
      });

      ApiResponse.success(res, result);
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }
}

export const aiController = new AIController();
