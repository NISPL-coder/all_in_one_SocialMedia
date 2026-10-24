import { Request, Response } from 'express';
import { db } from '../db/client';
import { ENV } from '../config/env';

export class WebhooksController {
  verifyWhatsAppWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === ENV.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ WhatsApp Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.warn('❌ WhatsApp Webhook verification mismatch');
      res.status(403).json({ error: 'Verification failed' });
    }
  }

  async handleWhatsAppWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;

      await db.auditLog.create({
        data: {
          action: 'WEBHOOK_RECEIVED',
          resourceType: 'WHATSAPP_WEBHOOK',
          details: payload,
        },
      });

      const entry = payload?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const statuses = value?.statuses;

      if (statuses && Array.isArray(statuses)) {
        for (const st of statuses) {
          const messageId = st.id;
          const statusType = st.status;
          console.log(`[WhatsApp Webhook] Message ${messageId} status: ${statusType}`);
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (err: any) {
      console.error('WhatsApp Webhook error:', err);
      res.status(500).json({ error: err.message });
    }
  }

  async handleProviderWebhook(req: Request, res: Response): Promise<void> {
    try {
      const provider = req.params.provider.toUpperCase();
      console.log(`[Provider Webhook] Received for: ${provider}`);
      res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const webhooksController = new WebhooksController();
