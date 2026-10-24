import { db } from '../db/client';
import { ENV } from '../config/env';
import { encryptToken } from '../utils/crypto';
import { verifyLinkedInToken } from './platforms/linkedin-auth.service';

export async function syncEnvAccounts(): Promise<void> {
  // 1. Sync LinkedIn if live token provided in .env
  if (ENV.LINKEDIN_ACCESS_TOKEN && !ENV.LINKEDIN_ACCESS_TOKEN.startsWith('mock_')) {
    try {
      console.log('🔄 Checking LINKEDIN_ACCESS_TOKEN from .env with LinkedIn API...');
      const verification = await verifyLinkedInToken(ENV.LINKEDIN_ACCESS_TOKEN);

      if (!verification.valid) {
        console.warn('⚠️ LINKEDIN_ACCESS_TOKEN in .env failed verification:', verification.errorMessage);
        return;
      }

      const accountName = verification.profile?.name || (ENV.LINKEDIN_AUTHOR_URN?.includes('organization') ? 'Company Page' : 'LinkedIn User');
      const externalId = verification.profile?.sub
        ? `urn:li:person:${verification.profile.sub}`
        : ENV.LINKEDIN_AUTHOR_URN || 'urn:li:person:me';
      const avatarUrl = verification.profile?.picture || '';

      const accounts = await db.connectedAccount.findMany({ where: { platform: 'LINKEDIN' } });
      if (accounts.length > 0) {
        await db.connectedAccount.update({
          where: { id: accounts[0].id },
          data: {
            accountName: accounts[0].accountName && !accounts[0].accountName.includes('TechVision')
              ? accounts[0].accountName
              : accountName,
            externalId: ENV.LINKEDIN_AUTHOR_URN
              ? ENV.LINKEDIN_AUTHOR_URN
              : (accounts[0].externalId && accounts[0].externalId !== 'urn:li:person:me' && !accounts[0].externalId.includes('8849201')
                ? accounts[0].externalId
                : externalId),
            avatarUrl: avatarUrl || accounts[0].avatarUrl,
            accessTokenEncrypted: encryptToken(ENV.LINKEDIN_ACCESS_TOKEN.trim()),
            scopes: verification.scopes,
            tokenExpiresAt: verification.expiresAt || null,
            status: 'CONNECTED',
          },
        });
        console.log(`✅ LinkedIn account auto-synced from .env (Status: Active with scopes: [${verification.scopes.join(', ')}])`);
      } else {
        await db.connectedAccount.create({
          data: {
            platform: 'LINKEDIN',
            accountName,
            accountType: 'USER_PROFILE',
            externalId,
            avatarUrl,
            accessTokenEncrypted: encryptToken(ENV.LINKEDIN_ACCESS_TOKEN.trim()),
            scopes: verification.scopes,
            tokenExpiresAt: verification.expiresAt || null,
            status: 'CONNECTED',
          },
        });
        console.log(`✅ LinkedIn account created from .env: ${accountName} (${externalId})`);
      }

      if (verification.warning) {
        console.log(`ℹ️ LinkedIn Notice: ${verification.warning}`);
      }
    } catch (err: any) {
      console.warn('⚠️ Could not verify LINKEDIN_ACCESS_TOKEN from .env:', err.response?.data || err.message);
    }
  }
}
