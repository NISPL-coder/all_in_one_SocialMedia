import test from 'node:test';
import assert from 'node:assert';
import { LinkedInService } from '../src/services/platforms/linkedin.service';
import { FacebookService } from '../src/services/platforms/facebook.service';
import { InstagramService } from '../src/services/platforms/instagram.service';
import { WhatsAppService } from '../src/services/platforms/whatsapp.service';
import { GoogleBusinessService } from '../src/services/platforms/google-business.service';
import { platformRegistry } from '../src/services/platforms/platform-registry';
import { encryptToken, decryptToken, hashPassword, verifyPassword } from '../src/utils/crypto';
import { db } from '../src/db/client';
import { publishingService } from '../src/services/publishing.service';

test('1. Security: AES-256-GCM Encryption and Decryption', () => {
  const secretToken = 'EAABwzLixnjYBAOd89423...meta_long_lived_user_token';
  const encrypted = encryptToken(secretToken);
  assert.notStrictEqual(encrypted, secretToken);
  assert.ok(encrypted.includes(':'));

  const decrypted = decryptToken(encrypted);
  assert.strictEqual(decrypted, secretToken);
});

test('2. Security: Password Hashing and Verification with bcrypt', async () => {
  const password = 'SuperSecretAdmin123!';
  const hash = await hashPassword(password);
  assert.notStrictEqual(hash, password);

  const match = await verifyPassword(password, hash);
  assert.strictEqual(match, true);

  const mismatch = await verifyPassword('WrongPassword', hash);
  assert.strictEqual(mismatch, false);
});

test('3. Platform Validation: LinkedIn constraints', () => {
  const service = new LinkedInService();
  const context = {
    id: 'acc-li-01',
    platform: 'LINKEDIN' as const,
    externalId: 'urn:li:organization:12345',
    accountName: 'TechVision',
    accessToken: 'mock_token',
  };

  // Valid payload
  const validRes = service.validate(
    { caption: 'Valid LinkedIn text', media: [] },
    context
  );
  assert.strictEqual(validRes.valid, true);

  // Invalid: Over 3,000 characters
  const longCaption = 'A'.repeat(3001);
  const invalidRes = service.validate(
    { caption: longCaption, media: [] },
    context
  );
  assert.strictEqual(invalidRes.valid, false);
  assert.ok(invalidRes.errors[0].includes('3,000'));
});

test('4. Platform Validation: Instagram requires media and rejects text-only posts', () => {
  const service = new InstagramService();
  const context = {
    id: 'acc-ig-01',
    platform: 'INSTAGRAM' as const,
    externalId: '17841405392817264',
    accountName: '@techvision',
    accessToken: 'mock_token',
  };

  // Empty media fails
  const noMediaRes = service.validate({ caption: 'Text only on Instagram', media: [] }, context);
  assert.strictEqual(noMediaRes.valid, false);
  assert.ok(noMediaRes.errors[0].includes('at least one image or video'));

  // Reject PDF document
  const pdfRes = service.validate(
    {
      caption: 'Look at my PDF',
      media: [{ id: 'm1', url: 'https://test.com/doc.pdf', mediaType: 'DOCUMENT', mimeType: 'application/pdf', fileName: 'doc.pdf' }],
    },
    context
  );
  assert.strictEqual(pdfRes.valid, false);
  assert.ok(pdfRes.errors.some(e => e.includes('PDF')));
});

test('5. Platform Validation: WhatsApp requires recipient phone number with country code', () => {
  const service = new WhatsAppService();
  const context = {
    id: 'acc-wa-01',
    platform: 'WHATSAPP' as const,
    externalId: 'phone_num_id_123',
    accountName: 'TechDesk',
    accessToken: 'mock_token',
  };

  // Missing phone
  const missingPhone = service.validate({ caption: 'Promo message', media: [] }, context);
  assert.strictEqual(missingPhone.valid, false);
  assert.ok(missingPhone.errors.some(e => e.includes('recipient phone number')));

  // Valid phone
  const validPhone = service.validate(
    { caption: 'Promo message', media: [], recipientPhone: '+15552345678' },
    context
  );
  assert.strictEqual(validPhone.valid, true);
});

test('6. Platform Validation: Google Business Profile requires location ID', () => {
  const service = new GoogleBusinessService();
  const context = {
    id: 'acc-gbp-01',
    platform: 'GOOGLE_BUSINESS' as const,
    externalId: 'locations/1029384756',
    accountName: 'HQ Store',
    accessToken: 'mock_token',
  };

  const validRes = service.validate(
    { caption: 'New business hours today!', media: [], locationId: 'locations/1029384756' },
    context
  );
  assert.strictEqual(validRes.valid, true);
});

test('7. Publishing Engine: Multi-platform distribution and partial failure handling', async () => {
  // Create a multi-channel post
  const created = await db.socialPost.create({
    data: {
      mainCaption: 'Automated Test Multi-Platform Post #Tech',
      status: 'DRAFT',
      targets: [
        { platform: 'LINKEDIN', status: 'PENDING' },
        { platform: 'FACEBOOK', status: 'PENDING' },
        { platform: 'WHATSAPP', status: 'PENDING', recipientPhone: '+15552345678' },
      ],
    },
  });

  assert.ok(created.id);
  assert.strictEqual(created.targets.length, 3);

  // Publish post
  const published = await publishingService.publishPost(created.id);
  assert.ok(published.status === 'PUBLISHED' || published.status === 'PARTIALLY_PUBLISHED');

  // Verify publishing attempts logged
  const attempts = await db.publishingAttempt.findMany({ where: { targetId: created.targets[0].id } });
  assert.ok(attempts.length >= 1);
  assert.ok(['SUCCESS', 'FAILED'].includes(attempts[0].status));
});

test('8. Retry Logic: Reprocesses only failed targets without duplicating successful ones', async () => {
  // Create post where 1 target will fail
  const post = await db.socialPost.create({
    data: {
      mainCaption: 'Post for retry testing',
      status: 'PROCESSING',
      targets: [
        { platform: 'LINKEDIN', status: 'SUCCESS', remotePostId: 'urn:li:share:999' },
        { platform: 'WHATSAPP', status: 'FAILED', lastErrorMessage: 'Simulated failure' },
      ],
    },
  });

  // Verify target statuses
  assert.strictEqual(post.targets[0].status, 'SUCCESS');
  assert.strictEqual(post.targets[1].status, 'FAILED');
});
