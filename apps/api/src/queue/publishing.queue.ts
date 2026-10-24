import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ENV } from '../config/env';
import { db } from '../db/client';
import { publishingService } from '../services/publishing.service';

export interface PublishJobData {
  postId: string;
  idempotencyKey: string;
}

let redisClient: IORedis | null = null;
let publishQueue: Queue<PublishJobData> | null = null;
let publishWorker: Worker<PublishJobData> | null = null;
let fallbackInterval: NodeJS.Timeout | null = null;

export function initPublishingQueue() {
  try {
    redisClient = new IORedis(ENV.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null, // don't hang if redis is not running locally
    });

    // Suppress unhandled EventEmitter error when Redis is not running locally
    redisClient.on('error', () => {
      // Handled silently since fallback scheduler runs automatically
    });

    redisClient.connect().then(() => {
      console.log('✅ Connected to Redis for BullMQ background publishing queue');
      
      publishQueue = new Queue<PublishJobData>('publishing-queue', {
        connection: redisClient as any,
      });

      publishWorker = new Worker<PublishJobData>(
        'publishing-queue',
        async (job: Job<PublishJobData>) => {
          console.log(`Processing BullMQ job ${job.id} for post ${job.data.postId}`);
          await publishingService.publishPost(job.data.postId);
        },
        { connection: redisClient as any }
      );

      publishWorker.on('completed', (job) => {
        console.log(`Job ${job.id} completed successfully`);
      });

      publishWorker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed with error:`, err);
      });
    }).catch(() => {
      console.log('ℹ️ Redis not detected at ' + ENV.REDIS_URL + '. Running embedded background scheduler.');
      startFallbackScheduler();
    });
  } catch (err) {
    console.log('ℹ️ Redis initialization skipped. Starting embedded scheduler runner.');
    startFallbackScheduler();
  }
}

function startFallbackScheduler() {
  if (fallbackInterval) return;
  console.log('⏱️ Embedded background scheduler started (checking scheduled posts every 10s)');
  
  fallbackInterval = setInterval(async () => {
    try {
      const now = new Date().toISOString();
      const scheduledPosts = await db.socialPost.findMany({
        where: { status: 'SCHEDULED' },
      });

      for (const post of scheduledPosts) {
        if (post.scheduledTime && post.scheduledTime <= now) {
          console.log(`🚀 Executing scheduled post ${post.id}`);
          await publishingService.publishPost(post.id);
        }
      }
    } catch (e) {
      console.error('Error in embedded scheduler loop:', e);
    }
  }, 10000);
}

export async function schedulePostJob(postId: string, scheduledTimeIso: string) {
  const idempotencyKey = `sched-${postId}-${new Date(scheduledTimeIso).getTime()}`;
  const delayMs = Math.max(0, new Date(scheduledTimeIso).getTime() - Date.now());

  // Record publishing job in DB
  await db.publishingJob.create({
    data: {
      targetId: postId,
      idempotencyKey,
      runAt: scheduledTimeIso,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 3,
    },
  });

  if (publishQueue) {
    await publishQueue.add(
      'publish-post',
      { postId, idempotencyKey },
      { delay: delayMs, jobId: idempotencyKey, removeOnComplete: true }
    );
  }
}

export async function cancelScheduledJob(postId: string) {
  if (publishQueue) {
    const jobs = await publishQueue.getJobs(['delayed', 'waiting']);
    for (const j of jobs) {
      if (j.data?.postId === postId) {
        await j.remove();
      }
    }
  }
}
