import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/analytics/summary - Dashboard metrics
router.get('/summary', requireAuth, (req, res) => analyticsController.getSummary(req, res));

// GET /api/analytics/platforms - Platform breakdown
router.get('/platforms', requireAuth, (req, res) => analyticsController.getPlatformStats(req, res));

export default router;
