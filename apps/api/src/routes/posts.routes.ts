import { Router } from 'express';
import { postsController } from '../controllers/posts.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createPostSchema,
  updatePostSchema,
  schedulePostSchema,
  previewPostSchema,
} from '../validators/post.validator';

const router = Router();

// GET /api/posts - List posts with filters
router.get('/', requireAuth, (req, res) => postsController.getPosts(req, res));

// GET /api/posts/:id - Single post
router.get('/:id', requireAuth, (req, res) => postsController.getPostById(req, res));

// POST /api/posts - Create post (Draft, Schedule, or Publish Now)
router.post('/', requireAuth, validate(createPostSchema), (req, res) => postsController.createPost(req, res));

// PATCH /api/posts/:id - Update post
router.patch('/:id', requireAuth, validate(updatePostSchema), (req, res) => postsController.updatePost(req, res));

// DELETE /api/posts/:id - Delete post
router.delete('/:id', requireAuth, (req, res) => postsController.deletePost(req, res));

// POST /api/posts/preview - Validate and prepare preview payload
router.post('/preview', requireAuth, validate(previewPostSchema), (req, res) => postsController.previewPost(req, res));

// POST /api/posts/:id/publish - Publish immediately
router.post('/:id/publish', requireAuth, (req, res) => postsController.publishNow(req, res));

// POST /api/posts/:id/schedule - Schedule post
router.post('/:id/schedule', requireAuth, validate(schedulePostSchema), (req, res) => postsController.schedulePost(req, res));

// POST /api/posts/:id/cancel - Cancel scheduled post
router.post('/:id/cancel', requireAuth, (req, res) => postsController.cancelScheduledPost(req, res));

// POST /api/posts/:id/retry - Retry failed targets
router.post('/:id/retry', requireAuth, (req, res) => postsController.retryFailedPost(req, res));

export default router;
