import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import { apiLimiter } from './middlewares/rate-limiter.middleware';
import { initPublishingQueue } from './queue/publishing.queue';
import { syncEnvAccounts } from './services/account-sync.service';
import apiRouter from './routes';

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: [ENV.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Static files for uploaded media
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// General API rate limiting
app.use('/api', apiLimiter);

// Mount Centralized API Router
app.use('/api', apiRouter);

// Centralized error handler
app.use(errorHandler);

// Start server and background scheduling worker
const server = app.listen(ENV.PORT, () => {
  console.log(`🚀 SocialHub API server running on http://localhost:${ENV.PORT}`);
  console.log(`🌐 Allowed frontend origin: ${ENV.FRONTEND_URL}`);
  initPublishingQueue();
  syncEnvAccounts().catch(console.error);
});

// Auto-recovery for port in use during hot-reloads
let retryTimer: NodeJS.Timeout | null = null;
let retryCount = 0;
const MAX_PORT_RETRIES = 5;

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    retryCount++;
    if (retryCount <= MAX_PORT_RETRIES) {
      console.warn(`⚠️ Port ${ENV.PORT} is busy, retrying in 1.5s (attempt ${retryCount}/${MAX_PORT_RETRIES})...`);
      if (!retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          try {
            server.close();
          } catch (_) {}
          server.listen(ENV.PORT);
        }, 1500);
      }
    } else {
      console.error(`❌ Port ${ENV.PORT} is occupied by another process. Please stop the running process and restart.`);
      process.exit(1);
    }
  } else {
    console.error('Server error:', err);
  }
});

// Graceful shutdown
const cleanup = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

export default app;
