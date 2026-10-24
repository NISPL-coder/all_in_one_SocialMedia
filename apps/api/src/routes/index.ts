import { Router } from 'express';
import authRoutes from './auth.routes';
import accountsRoutes from './accounts.routes';
import postsRoutes from './posts.routes';
import mediaRoutes from './media.routes';
import analyticsRoutes from './analytics.routes';
import aiRoutes from './ai.routes';
import webhooksRoutes from './webhooks.routes';
import settingsRoutes from './settings.routes';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'socialhub-api',
  });
});

// Modular sub-routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/accounts', accountsRoutes);
apiRouter.use('/posts', postsRoutes);
apiRouter.use('/media', mediaRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/webhooks', webhooksRoutes);
apiRouter.use('/settings', settingsRoutes);

export default apiRouter;
