import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { mediaController } from '../controllers/media.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { ENV } from '../config/env';

const router = Router();

if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ENV.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported.`));
    }
  },
});

// GET /api/media - List media
router.get('/', requireAuth, (req, res) => mediaController.getMedia(req, res));

// POST /api/media/upload - Upload file
router.post('/upload', requireAuth, upload.single('file'), (req, res) => mediaController.uploadMedia(req, res));

// DELETE /api/media/:id - Delete media
router.delete('/:id', requireAuth, (req, res) => mediaController.deleteMedia(req, res));

export default router;
