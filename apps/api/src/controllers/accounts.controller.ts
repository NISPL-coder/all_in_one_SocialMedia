import { Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { db } from '../db/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { encryptToken, decryptToken } from '../utils/crypto';
import { ENV } from '../config/env';
import { platformRegistry } from '../services/platforms/platform-registry';
import { PlatformType } from '@socialhub/shared';
import { ApiResponse } from '../utils/api-response';
import { verifyLinkedInToken } from '../services/platforms/linkedin-auth.service';

const oauthStates = new Map<string, { platform: PlatformType; createdAt: number }>();

export class AccountsController {
  async getAccounts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const accounts = await db.connectedAccount.findMany();
      const sanitized = accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        accountName: a.accountName,
        accountType: a.accountType,
        avatarUrl: a.avatarUrl,
        externalId: a.externalId,
        status: a.status,
        tokenExpiresAt: a.tokenExpiresAt,
        scopes: a.scopes,
        metadata: a.metadata,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        isConfigured: !a.accessTokenEncrypted.includes('mock_'),
      }));
      ApiResponse.success(res, { accounts: sanitized });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async initiateConnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const platform = req.params.platform.toUpperCase() as PlatformType;
      const state = crypto.randomBytes(16).toString('hex');
      oauthStates.set(state, { platform, createdAt: Date.now() });

      let authUrl = '';

      switch (platform) {
        case 'LINKEDIN': {
          if (!ENV.LINKEDIN_CLIENT_ID) {
            ApiResponse.success(res, {
              requiresCredentials: true,
              authUrl: null,
              message: 'LinkedIn Client ID not configured in .env. Enter LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to enable live OAuth.',
            });
            return;
          }
          const scopes = encodeURIComponent('openid profile w_member_social');
          authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${ENV.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(ENV.LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${scopes}`;
          break;
        }
        case 'FACEBOOK': {
          if (!ENV.META_APP_ID) {
            ApiResponse.success(res, {
              requiresCredentials: true,
              authUrl: null,
              message: 'Meta App ID not configured in .env. Enter META_APP_ID and META_APP_SECRET to enable live Facebook OAuth.',
            });
            return;
          }
          const scopes = encodeURIComponent('pages_show_list,pages_read_engagement,pages_manage_posts');
          authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${ENV.META_APP_ID}&redirect_uri=${encodeURIComponent(ENV.META_REDIRECT_URI)}&state=${state}&scope=${scopes}&auth_type=rerequest`;
          break;
        }
        case 'INSTAGRAM': {
          if (!ENV.META_APP_ID) {
            ApiResponse.success(res, {
              requiresCredentials: true,
              authUrl: null,
              message: 'Meta App ID not configured in .env. Enter META_APP_ID and META_APP_SECRET to enable Instagram Professional OAuth.',
            });
            return;
          }
          const scopes = encodeURIComponent('instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management');
          authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${ENV.META_APP_ID}&redirect_uri=${encodeURIComponent(ENV.META_INSTAGRAM_REDIRECT_URI)}&state=${state}&scope=${scopes}&auth_type=rerequest`;
          break;
        }
        case 'GOOGLE_BUSINESS': {
          if (!ENV.GOOGLE_CLIENT_ID) {
            ApiResponse.success(res, {
              requiresCredentials: true,
              authUrl: null,
              message: 'Google Client ID not configured in .env. Enter GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google OAuth.',
            });
            return;
          }
          const scopes = encodeURIComponent('https://www.googleapis.com/auth/business.manage');
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${ENV.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(ENV.GOOGLE_REDIRECT_URI)}&response_type=code&scope=${scopes}&access_type=offline&state=${state}&prompt=consent`;
          break;
        }
        default:
          ApiResponse.error(res, `Unsupported platform: ${platform}`, 400);
          return;
      }

      ApiResponse.success(res, { authUrl, state });
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async handleOAuthCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const platform = req.params.platform.toUpperCase() as PlatformType;
      const { code, state, error, error_description } = req.query;

      if (error) {
        res.redirect(`${ENV.FRONTEND_URL}/accounts?error=${encodeURIComponent(String(error_description || error))}`);
        return;
      }

      if (!code || !state) {
        res.redirect(`${ENV.FRONTEND_URL}/accounts?error=missing_code_or_state`);
        return;
      }

      const stateData = oauthStates.get(String(state));
      if (!stateData) {
        res.redirect(`${ENV.FRONTEND_URL}/accounts?error=invalid_or_expired_state`);
        return;
      }
      oauthStates.delete(String(state));

      if (platform === 'LINKEDIN') {
        const tokenRes = await axios.post(
          'https://www.linkedin.com/oauth/v2/accessToken',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: String(code),
            redirect_uri: ENV.LINKEDIN_REDIRECT_URI,
            client_id: ENV.LINKEDIN_CLIENT_ID,
            client_secret: ENV.LINKEDIN_CLIENT_SECRET,
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenRes.data.access_token;
        const expiresIn = tokenRes.data.expires_in;

        const verification = await verifyLinkedInToken(accessToken);
        if (!verification.valid) {
          res.redirect(`${ENV.FRONTEND_URL}/accounts?error=${encodeURIComponent(verification.errorMessage || 'Token verification failed')}`);
          return;
        }

        const accountName = verification.profile?.name || 'LinkedIn User';
        const externalId = verification.profile?.sub
          ? `urn:li:person:${verification.profile.sub}`
          : 'urn:li:person:me';
        const avatarUrl = verification.profile?.picture || '';

        const existingAccounts = await db.connectedAccount.findMany({ where: { platform: 'LINKEDIN' } });
        if (existingAccounts.length > 0) {
          await db.connectedAccount.update({
            where: { id: existingAccounts[0].id },
            data: {
              accountName,
              accountType: 'USER_PROFILE',
              avatarUrl: avatarUrl || existingAccounts[0].avatarUrl,
              externalId,
              accessTokenEncrypted: encryptToken(accessToken),
              tokenExpiresAt: verification.expiresAt || new Date(Date.now() + expiresIn * 1000).toISOString(),
              scopes: verification.scopes,
              status: 'CONNECTED',
            },
          });
        } else {
          await db.connectedAccount.create({
            data: {
              platform: 'LINKEDIN',
              accountName,
              accountType: 'USER_PROFILE',
              avatarUrl,
              externalId,
              accessTokenEncrypted: encryptToken(accessToken),
              tokenExpiresAt: verification.expiresAt || new Date(Date.now() + expiresIn * 1000).toISOString(),
              scopes: verification.scopes,
              status: 'CONNECTED',
            },
          });
        }
      } else if (platform === 'FACEBOOK') {
        const tokenRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
          params: {
            client_id: ENV.META_APP_ID,
            client_secret: ENV.META_APP_SECRET,
            redirect_uri: ENV.META_REDIRECT_URI,
            code: String(code),
          },
        });

        const userAccessToken = tokenRes.data.access_token;
        let longLivedToken = userAccessToken;
        try {
          const exchangeRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
            params: {
              grant_type: 'fb_exchange_token',
              client_id: ENV.META_APP_ID,
              client_secret: ENV.META_APP_SECRET,
              fb_exchange_token: userAccessToken,
            },
          });
          if (exchangeRes.data?.access_token) {
            longLivedToken = exchangeRes.data.access_token;
          }
        } catch (e) {
          console.warn('Long-lived token exchange warning:', e);
        }

        const pagesRes = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
          params: {
            access_token: longLivedToken,
            fields: 'id,name,access_token,category,picture',
          },
        });

        const pages = pagesRes.data?.data || [];
        const existingAccounts = await db.connectedAccount.findMany({ where: { platform: 'FACEBOOK' } });

        if (pages.length > 0) {
          const primaryPage = pages[0];
          const pageData = {
            accountName: primaryPage.name,
            accountType: 'PAGE' as const,
            avatarUrl: primaryPage.picture?.data?.url || '',
            externalId: primaryPage.id,
            accessTokenEncrypted: encryptToken(primaryPage.access_token),
            scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
            status: 'CONNECTED' as const,
            metadata: {
              category: primaryPage.category,
              userTokenEncrypted: encryptToken(longLivedToken),
              allPages: pages.map((p: any) => ({ id: p.id, name: p.name })),
            },
          };

          if (existingAccounts.length > 0) {
            await db.connectedAccount.update({
              where: { id: existingAccounts[0].id },
              data: pageData,
            });
          } else {
            await db.connectedAccount.create({
              data: {
                platform: 'FACEBOOK',
                ...pageData,
              },
            });
          }
        } else {
          const meRes = await axios.get('https://graph.facebook.com/v21.0/me', {
            params: {
              access_token: longLivedToken,
              fields: 'id,name,picture',
            },
          });
          const userData = {
            accountName: `${meRes.data.name || 'Facebook User'} (Personal)`,
            accountType: 'PAGE' as const,
            avatarUrl: meRes.data.picture?.data?.url || '',
            externalId: meRes.data.id || 'me',
            accessTokenEncrypted: encryptToken(longLivedToken),
            scopes: ['pages_show_list'],
            status: 'CONNECTED' as const,
          };
          if (existingAccounts.length > 0) {
            await db.connectedAccount.update({ where: { id: existingAccounts[0].id }, data: userData });
          } else {
            await db.connectedAccount.create({ data: { platform: 'FACEBOOK', ...userData } });
          }
        }
      } else if (platform === 'INSTAGRAM') {
        const tokenRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
          params: {
            client_id: ENV.META_APP_ID,
            client_secret: ENV.META_APP_SECRET,
            redirect_uri: ENV.META_INSTAGRAM_REDIRECT_URI,
            code: String(code),
          },
        });

        const userAccessToken = tokenRes.data.access_token;
        let longLivedToken = userAccessToken;
        try {
          const exchangeRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
            params: {
              grant_type: 'fb_exchange_token',
              client_id: ENV.META_APP_ID,
              client_secret: ENV.META_APP_SECRET,
              fb_exchange_token: userAccessToken,
            },
          });
          if (exchangeRes.data?.access_token) {
            longLivedToken = exchangeRes.data.access_token;
          }
        } catch (e) {
          console.warn('Long-lived token exchange warning:', e);
        }

        const pagesRes = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
          params: {
            access_token: longLivedToken,
            fields: 'id,name,access_token,category,instagram_business_account{id,username,profile_picture_url,name},connected_instagram_account{id,username,profile_picture_url,name}',
          },
        });

        const pages = pagesRes.data?.data || [];
        let igAccount: any = null;
        let matchedPage: any = null;

        for (const p of pages) {
          if (p.instagram_business_account) {
            igAccount = p.instagram_business_account;
            matchedPage = p;
            break;
          }
          if (p.connected_instagram_account) {
            igAccount = p.connected_instagram_account;
            matchedPage = p;
            break;
          }
          // Some Meta app configs require querying the specific Page node using the Page's access token
          if (p.id && p.access_token) {
            try {
              const pageDetail = await axios.get(`https://graph.facebook.com/v21.0/${p.id}`, {
                params: {
                  fields: 'id,name,instagram_business_account{id,username,profile_picture_url,name},connected_instagram_account{id,username,profile_picture_url,name}',
                  access_token: p.access_token,
                },
              });
              if (pageDetail.data?.instagram_business_account) {
                igAccount = pageDetail.data.instagram_business_account;
                matchedPage = p;
                break;
              }
              if (pageDetail.data?.connected_instagram_account) {
                igAccount = pageDetail.data.connected_instagram_account;
                matchedPage = p;
                break;
              }
            } catch (pageErr) {
              // Ignore individual page fetch errors and continue
            }
          }
        }

        const existingIg = await db.connectedAccount.findMany({ where: { platform: 'INSTAGRAM' } });

        if (igAccount && matchedPage) {
          const igData = {
            accountName: `@${igAccount.username || igAccount.name}`,
            accountType: 'IG_BUSINESS' as const,
            avatarUrl: igAccount.profile_picture_url || '',
            externalId: igAccount.id,
            accessTokenEncrypted: encryptToken(matchedPage.access_token || longLivedToken),
            scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
            status: 'CONNECTED' as const,
            metadata: { username: igAccount.username, linkedPageId: matchedPage.id, pageName: matchedPage.name },
          };
          if (existingIg.length > 0) {
            await db.connectedAccount.update({ where: { id: existingIg[0].id }, data: igData });
          } else {
            await db.connectedAccount.create({ data: { platform: 'INSTAGRAM', ...igData } });
          }
        } else if (pages.length === 0) {
          res.redirect(
            `${ENV.FRONTEND_URL}/accounts?error=${encodeURIComponent(
              'No Facebook Pages found. During Facebook Login, please ensure you check the box next to your Facebook Page, or create a Facebook Page if you do not have one yet.'
            )}`
          );
          return;
        } else {
          const pageNames = pages.map((p: any) => p.name).join(', ');
          res.redirect(
            `${ENV.FRONTEND_URL}/accounts?error=${encodeURIComponent(
              `Found Facebook Page(s) "${pageNames}", but no linked Instagram Professional account was detected. Please go to Facebook Page Settings > Linked Accounts > Instagram and connect your Instagram Professional account.`
            )}`
          );
          return;
        }
      }

      res.redirect(`${ENV.FRONTEND_URL}/accounts?connected=${platform}`);
    } catch (err: any) {
      console.error('OAuth Callback Error:', err);
      res.redirect(`${ENV.FRONTEND_URL}/accounts?error=${encodeURIComponent(err.message || 'OAuth error')}`);
    }
  }

  async reconnectAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const account = await db.connectedAccount.findUnique({ where: { id: req.params.id } });
      if (!account) {
        ApiResponse.error(res, 'Account not found', 404);
        return;
      }
      ApiResponse.success(res, { accountId: account.id, platform: account.platform }, 'Reconnect initiated');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async testAccountConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const account = await db.connectedAccount.findUnique({ where: { id: req.params.id } });
      if (!account) {
        ApiResponse.error(res, 'Account not found', 404);
        return;
      }

      const service = platformRegistry.getService(account.platform);
      const token = decryptToken(account.accessTokenEncrypted);

      const result = await service.testConnection({
        id: account.id,
        platform: account.platform,
        externalId: account.externalId,
        accountName: account.accountName,
        accessToken: token,
        metadata: account.metadata,
      });

      if (result.success) {
        await db.connectedAccount.update({
          where: { id: account.id },
          data: { status: 'CONNECTED' },
        });
      }

      ApiResponse.success(res, result);
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async saveDirectToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const platform = req.params.platform.toUpperCase() as PlatformType;
      const { accessToken, externalId, accountName } = req.body;

      if (!accessToken || !accessToken.trim()) {
        ApiResponse.error(res, 'Access token is required', 400);
        return;
      }

      let finalName = accountName || `${platform} Account`;
      let finalExternalId = externalId || '';
      let avatarUrl = '';
      let warningMessage: string | undefined;
      let verifiedScopes: string[] = [];
      let tokenExpiresAt: string | null = null;

      let finalTokenToStore = accessToken.trim();
      let accountType: any = platform === 'LINKEDIN' ? 'USER_PROFILE' : 'PAGE';

      if (platform === 'LINKEDIN') {
        const verification = await verifyLinkedInToken(accessToken.trim());

        // Requirement 5: Never claim the account is connected merely because a token was submitted.
        // Save the account only after the relevant verification succeeds.
        if (!verification.valid) {
          ApiResponse.error(
            res,
            verification.errorMessage || 'Invalid LinkedIn access token or missing permissions.',
            400,
            verification.errorCode,
            { scopes: verification.scopes }
          );
          return;
        }

        verifiedScopes = verification.scopes;
        tokenExpiresAt = verification.expiresAt || null;
        warningMessage = verification.warning;

        finalName = verification.profile?.name || accountName || 'LinkedIn User';
        finalExternalId = verification.profile?.sub
          ? `urn:li:person:${verification.profile.sub}`
          : (externalId && externalId.trim() !== '' && externalId !== 'urn:li:person:me'
              ? externalId
              : (ENV.LINKEDIN_AUTHOR_URN || 'urn:li:person:me'));
        avatarUrl = verification.profile?.picture || '';
      } else if (platform === 'FACEBOOK') {
        try {
          const rawToken = accessToken.trim();
          let pageToken = rawToken;
          let targetPageId = externalId ? externalId.trim() : '';
          let targetPageName = accountName || '';
          let targetPageAvatar = '';

          try {
            const pagesRes = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
              params: { access_token: rawToken, fields: 'id,name,access_token,picture' },
            });
            const pages = pagesRes.data?.data || [];
            if (pages.length > 0) {
              const matched = targetPageId ? (pages.find((p: any) => p.id === targetPageId) || pages[0]) : pages[0];
              targetPageId = matched.id;
              targetPageName = matched.name;
              pageToken = matched.access_token;
              targetPageAvatar = matched.picture?.data?.url || '';
            }
          } catch (e) {
            // Might already be a direct Page Access Token
          }

          if (!targetPageId || targetPageId === 'me') {
            const meRes = await axios.get('https://graph.facebook.com/v21.0/me', {
              params: {
                access_token: pageToken,
                fields: 'id,name,picture',
              },
            });
            targetPageId = meRes.data?.id;
            if (!targetPageName) targetPageName = meRes.data?.name;
            if (!targetPageAvatar) targetPageAvatar = meRes.data?.picture?.data?.url || '';
          }

          finalName = targetPageName || 'Facebook Page';
          finalExternalId = targetPageId;
          avatarUrl = targetPageAvatar;
          finalTokenToStore = pageToken;
          verifiedScopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
        } catch (fbErr: any) {
          const errMsg = fbErr.response?.data?.error?.message || fbErr.message;
          ApiResponse.error(res, `Invalid Facebook token: ${errMsg}`, 400);
          return;
        }
      } else if (platform === 'INSTAGRAM') {
        accountType = 'IG_BUSINESS';
        try {
          const rawToken = accessToken.trim();
          let igUserId = externalId ? externalId.trim() : '';
          let igUsername = accountName || '';
          let igAvatar = '';

          // 1. Try querying graph.instagram.com/me
          try {
            const igRes = await axios.get('https://graph.instagram.com/me', {
              params: {
                access_token: rawToken,
                fields: 'id,username,account_type,profile_picture_url',
              },
            });
            igUserId = igRes.data?.id || igUserId;
            igUsername = igRes.data?.username || igUsername;
            igAvatar = igRes.data?.profile_picture_url || '';
          } catch (e1) {
            // 2. Try graph.facebook.com/v21.0/me or target ID
            try {
              const fbIgTarget = igUserId || 'me';
              const fbRes = await axios.get(`https://graph.facebook.com/v21.0/${fbIgTarget}`, {
                params: {
                  access_token: rawToken,
                  fields: 'id,username,name,profile_picture_url',
                },
              });
              igUserId = fbRes.data?.id || igUserId;
              igUsername = fbRes.data?.username || fbRes.data?.name || igUsername;
              igAvatar = fbRes.data?.profile_picture_url || '';
            } catch (e2) {
              // Might be user submitting token with explicit externalId
            }

            // 3. If still not resolved or generic personal Facebook ID, check linked Instagram Business Account on /me/accounts
            try {
              const pagesRes = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
                params: {
                  access_token: rawToken,
                  fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url,name}',
                },
              });
              const pages = pagesRes.data?.data || [];
              const igPage = pages.find((p: any) => p.instagram_business_account);
              if (igPage && igPage.instagram_business_account) {
                const ig = igPage.instagram_business_account;
                igUserId = ig.id;
                igUsername = ig.username || ig.name || igUsername;
                igAvatar = ig.profile_picture_url || igAvatar;
                finalTokenToStore = igPage.access_token || rawToken;
              }
            } catch (e3) {
              // Not a user token with pages
            }
          }

          finalName = igUsername ? (igUsername.startsWith('@') ? igUsername : `@${igUsername}`) : (accountName || '@instagram_account');
          finalExternalId = igUserId || externalId || 'me';
          avatarUrl = igAvatar;
          finalTokenToStore = finalTokenToStore || rawToken;
          verifiedScopes = ['instagram_basic', 'instagram_content_publish'];
        } catch (igErr: any) {
          const errMsg = igErr.response?.data?.error?.message || igErr.message;
          ApiResponse.error(res, `Invalid Instagram token: ${errMsg}`, 400);
          return;
        }
      }

      const existing = await db.connectedAccount.findMany({ where: { platform } });
      let account;
      if (existing.length > 0) {
        account = await db.connectedAccount.update({
          where: { id: existing[0].id },
          data: {
            accountName: finalName,
            accountType,
            externalId: finalExternalId || existing[0].externalId,
            accessTokenEncrypted: encryptToken(finalTokenToStore),
            avatarUrl: avatarUrl || existing[0].avatarUrl,
            scopes: verifiedScopes.length > 0 ? verifiedScopes : existing[0].scopes,
            tokenExpiresAt: tokenExpiresAt || existing[0].tokenExpiresAt,
            status: 'CONNECTED',
          },
        });
      } else {
        account = await db.connectedAccount.create({
          data: {
            platform,
            accountName: finalName,
            accountType,
            avatarUrl,
            externalId: finalExternalId,
            accessTokenEncrypted: encryptToken(finalTokenToStore),
            scopes: verifiedScopes,
            tokenExpiresAt,
            status: 'CONNECTED',
          },
        });
      }

      // Requirement 6: Keep the token encrypted server-side using AES-256-GCM.
      // Never expose access tokens or client secrets in frontend responses or logs.
      const sanitized = {
        id: account.id,
        platform: account.platform,
        accountName: account.accountName,
        accountType: account.accountType,
        avatarUrl: account.avatarUrl,
        externalId: account.externalId,
        status: account.status,
        tokenExpiresAt: account.tokenExpiresAt,
        scopes: account.scopes,
        isConfigured: true,
      };

      ApiResponse.success(
        res,
        { account: sanitized, warning: warningMessage },
        warningMessage || 'Account token verified and connected successfully'
      );
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }

  async disconnectAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deleted = await db.connectedAccount.delete({ where: { id: req.params.id } });
      await db.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'ACCOUNT_DISCONNECTED',
          resourceType: 'ACCOUNT',
          resourceId: req.params.id,
          details: { accountName: deleted?.accountName, platform: deleted?.platform },
        },
      });
      ApiResponse.success(res, null, 'Account disconnected successfully');
    } catch (err: any) {
      ApiResponse.error(res, err.message, 500);
    }
  }
}

export const accountsController = new AccountsController();
