import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('🤖 SocialHub Dedicated Background Worker Starting...');

try {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy: () => 5000,
  });

  connection.connect().then(() => {
    console.log(`✅ Worker connected to Redis at ${REDIS_URL}`);

    const worker = new Worker(
      'publishing-queue',
      async (job: Job) => {
        console.log(`[Worker] Executing scheduled publishing job: ${job.id}`, job.data);
        // Worker processes background jobs independently
        return { processed: true, timestamp: new Date().toISOString() };
      },
      { connection: connection as any, concurrency: 5 }
    );

    worker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed.`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed:`, err);
    });
  }).catch((err) => {
    console.warn(`[Worker] Standalone Redis not reachable (${err.message}). In-app fallback scheduler in apps/api will process scheduled posts.`);
  });
} catch (e: any) {
  console.warn('[Worker] Worker initialization deferred:', e.message);
}
