// ============================================
// Webhook Security (HMAC SHA-256 Signature Verification)
// ============================================

import crypto from 'crypto';
import { Request } from 'express';
import { config } from '../config';

export function verifyMetaSignature(req: Request): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = config.META_APP_SECRET || config.WEBHOOK_VERIFY_TOKEN;

  // If no secret configured in dev mode, allow but warn
  if (!secret) {
    if (config.isProd) {
      console.warn('⚠️ Webhook verification skipped: No META_APP_SECRET or WEBHOOK_VERIFY_TOKEN configured');
      return false;
    }
    return true;
  }

  if (!signature) {
    console.warn('❌ Missing x-hub-signature-256 header on webhook request');
    return false;
  }

  try {
    const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedHash = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedHash);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    console.error('❌ Error validating webhook signature:', error);
    return false;
  }
}
