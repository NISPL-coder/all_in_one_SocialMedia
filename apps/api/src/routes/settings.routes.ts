import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateProfileSchema } from '../validators/auth.validator';

const router = Router();

// GET /api/settings - Read application settings & credential readiness
router.get('/', requireAuth, (req, res) => settingsController.getSettings(req, res));

// PATCH /api/settings/profile - Update user profile & timezone
router.patch('/profile', requireAuth, validate(updateProfileSchema), (req, res) =>
  settingsController.updateProfile(req, res)
);

export default router;
