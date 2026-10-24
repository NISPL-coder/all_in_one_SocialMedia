import { Router } from 'express';
import { webhooksController } from '../controllers/webhooks.controller';

const router = Router();

// GET /api/webhooks/whatsapp - Webhook Verification Challenge
router.get('/whatsapp', (req, res) => webhooksController.verifyWhatsAppWebhook(req, res));

// POST /api/webhooks/whatsapp - Inbound events (delivery, read receipts)
router.post('/whatsapp', (req, res) => webhooksController.handleWhatsAppWebhook(req, res));

// POST /api/webhooks/:provider - Generic webhook receiver
router.post('/:provider', (req, res) => webhooksController.handleProviderWebhook(req, res));

export default router;
