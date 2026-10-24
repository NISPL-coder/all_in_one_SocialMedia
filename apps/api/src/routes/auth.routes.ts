import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authLimiter } from '../middlewares/rate-limiter.middleware';
import { loginSchema } from '../validators/auth.validator';

const router = Router();

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), (req, res) => authController.login(req, res));

// POST /api/auth/logout
router.post('/logout', (req, res) => authController.logout(req, res));

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => authController.getMe(req, res));

export default router;
