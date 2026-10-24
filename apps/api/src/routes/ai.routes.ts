import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { aiGenerateSchema } from '../validators/ai.validator';

const router = Router();

// POST /api/ai/generate - AI Content generation
router.post('/generate', requireAuth, validate(aiGenerateSchema), (req, res) => aiController.generateCaptions(req, res));

export default router;
