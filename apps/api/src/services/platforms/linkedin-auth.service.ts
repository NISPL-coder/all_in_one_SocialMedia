import axios, { AxiosInstance } from 'axios';
import { ENV } from '../../config/env';

export type LinkedInDiagnosticCode =
  | 'ACTIVE'
  | 'INACTIVE_TOKEN'
  | 'CLIENT_ID_MISMATCH'
  | 'MISSING_PUBLISH_PERMISSION'
  | 'SCOPE_FIELD_MISSING'
  | 'INVALID_ACCESS_TOKEN'
  | 'INVALID_CLIENT_CREDENTIALS'
  | 'MISSING_CLIENT_CREDENTIALS'
  | 'LINKEDIN_API_ERROR'
  | 'LINKEDIN_NETWORK_FAILURE';

export interface LinkedInIntrospectResult {
  success: boolean;
  diagnosticCode: LinkedInDiagnosticCode;
  diagnosticMessage: string;
  active: boolean;
  clientId?: string;
  scopes: string[];
  expiresAt?: string;
  authorizedAt?: string;
  authType?: string;
}

export interface LinkedInTokenVerificationResult {
  valid: boolean;
  active: boolean;
  scopes: string[];
  hasPublishPermission: boolean;
  hasOpenIdScopes: boolean;
  expiresAt?: string;
  clientId?: string;
  profile?: {
    name?: string;
    sub?: string;
    picture?: string;
    email?: string;
  };
  errorCode?: LinkedInDiagnosticCode | string;
  errorMessage?: string;
  warning?: string;
}

/**
 * Official LinkedIn OAuth 2.0 Token Introspection (RFC 7662):
 * Endpoint: POST https://www.linkedin.com/oauth/v2/introspectToken
 * Content-Type: application/x-www-form-urlencoded
 *
 * Security:
 * - Only called from the backend.
 * - Access tokens and client secrets are NEVER logged or returned in responses.
 */
export async function introspectLinkedInToken(
  token: string,
  clientId: string,
  clientSecret: string,
  httpClient: AxiosInstance | typeof axios = axios
): Promise<LinkedInIntrospectResult> {
  const cleanToken = token?.trim();
  const cleanClientId = clientId?.trim();
  const cleanClientSecret = clientSecret?.trim();

  if (!cleanClientId || !cleanClientSecret) {
    return {
      success: false,
      diagnosticCode: 'MISSING_CLIENT_CREDENTIALS',
      diagnosticMessage: 'LinkedIn Client ID or Client Secret is not configured in environment variables.',
      active: false,
      scopes: [],
    };
  }

  if (!cleanToken || cleanToken.startsWith('mock_')) {
    return {
      success: false,
      diagnosticCode: 'INVALID_ACCESS_TOKEN',
      diagnosticMessage: 'A valid, non-mock LinkedIn access token is required.',
      active: false,
      scopes: [],
    };
  }

  const formParams = new URLSearchParams({
    client_id: cleanClientId,
    client_secret: cleanClientSecret,
    token: cleanToken,
  });

  try {
    const res = await httpClient.post(
      'https://www.linkedin.com/oauth/v2/introspectToken',
      formParams.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );

    const data = res.data;

    // 1. Check active status
    if (!data || data.active !== true) {
      return {
        success: false,
        diagnosticCode: 'INACTIVE_TOKEN',
        diagnosticMessage: 'LinkedIn token is inactive, revoked, or expired.',
        active: false,
        clientId: data?.client_id,
        scopes: [],
        expiresAt: data?.expires_at ? new Date(data.expires_at * 1000).toISOString() : undefined,
      };
    }

    // 2. Confirm client_id matches the configured LinkedIn app
    if (data.client_id && data.client_id !== cleanClientId) {
      return {
        success: false,
        diagnosticCode: 'CLIENT_ID_MISMATCH',
        diagnosticMessage: `Token was issued for LinkedIn App client_id "${data.client_id}", which does not match your configured app "${cleanClientId}".`,
        active: true,
        clientId: data.client_id,
        scopes: [],
      };
    }

    // 3. Read scopes from the returned scope field
    // Do not interpret a missing scope field as an empty list or invalid token automatically
    if (data.scope === undefined || data.scope === null) {
      return {
        success: false,
        diagnosticCode: 'SCOPE_FIELD_MISSING',
        diagnosticMessage: 'LinkedIn introspection response is missing the required "scope" field.',
        active: true,
        clientId: data.client_id,
        scopes: [],
      };
    }

    let scopes: string[] = [];
    if (Array.isArray(data.scope)) {
      scopes = data.scope.map((s: any) => String(s).trim()).filter(Boolean);
    } else if (data.scope !== undefined && data.scope !== null) {
      scopes = String(data.scope)
        .split(/[,\s]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    // 4. Validate the required publishing scope (w_member_social or w_organization_social)
    const hasPublishPermission = scopes.some((s) =>
      ['w_member_social', 'w_organization_social'].includes(s)
    );

    if (!hasPublishPermission) {
      return {
        success: false,
        diagnosticCode: 'MISSING_PUBLISH_PERMISSION',
        diagnosticMessage: `LinkedIn token is active but missing required publishing scope 'w_member_social'. Granted scopes: [${scopes.join(', ') || 'none'}].`,
        active: true,
        clientId: data.client_id,
        scopes,
        expiresAt: data.expires_at ? new Date(data.expires_at * 1000).toISOString() : undefined,
      };
    }

    return {
      success: true,
      diagnosticCode: 'ACTIVE',
      diagnosticMessage: 'LinkedIn token is active and authorized for publishing.',
      active: true,
      clientId: data.client_id,
      scopes,
      expiresAt: data.expires_at ? new Date(data.expires_at * 1000).toISOString() : undefined,
      authorizedAt: data.authorized_at ? new Date(data.authorized_at * 1000).toISOString() : undefined,
      authType: data.auth_type,
    };
  } catch (err: any) {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      const errorStr = data?.error || '';
      const errorDesc = data?.error_description || data?.message || '';

      if (errorStr === 'invalid_client' || errorStr === 'invalid_client_id') {
        return {
          success: false,
          diagnosticCode: 'INVALID_CLIENT_CREDENTIALS',
          diagnosticMessage: `LinkedIn rejected app credentials: ${errorDesc || 'Client ID or Client Secret is invalid'}.`,
          active: false,
          scopes: [],
        };
      }

      if (
        errorStr === 'invalid_access_token' ||
        errorStr === 'invalid_token' ||
        errorDesc.toLowerCase().includes('token')
      ) {
        return {
          success: false,
          diagnosticCode: 'INVALID_ACCESS_TOKEN',
          diagnosticMessage: `LinkedIn rejected access token: ${errorDesc || 'Malformed or unrecognized token'}.`,
          active: false,
          scopes: [],
        };
      }

      return {
        success: false,
        diagnosticCode: 'LINKEDIN_API_ERROR',
        diagnosticMessage: `LinkedIn OAuth introspection returned HTTP ${status}: ${errorDesc || errorStr || 'Unknown API error'}.`,
        active: false,
        scopes: [],
      };
    }

    return {
      success: false,
      diagnosticCode: 'LINKEDIN_NETWORK_FAILURE',
      diagnosticMessage: `Network error connecting to LinkedIn introspection endpoint: ${err.message || 'Connection timeout or network failure'}.`,
      active: false,
      scopes: [],
    };
  }
}

/**
 * End-to-end LinkedIn Token Verification:
 * 1. Calls introspectLinkedInToken using official RFC 7662 endpoint.
 * 2. If token is active with w_member_social, conditionally looks up member profile
 *    via GET /v2/userinfo ONLY when openid and profile scopes are present.
 * 3. Never fails token verification merely because optional profile lookup is forbidden.
 */
export async function verifyLinkedInToken(
  accessToken: string,
  providedClientId?: string,
  providedClientSecret?: string,
  httpClient: AxiosInstance | typeof axios = axios
): Promise<LinkedInTokenVerificationResult> {
  const token = accessToken?.trim();
  const clientId = providedClientId || ENV.LINKEDIN_CLIENT_ID;
  const clientSecret = providedClientSecret || ENV.LINKEDIN_CLIENT_SECRET;

  const intro = await introspectLinkedInToken(token, clientId, clientSecret, httpClient);

  if (!intro.success) {
    return {
      valid: false,
      active: intro.active,
      scopes: intro.scopes,
      hasPublishPermission: false,
      hasOpenIdScopes: false,
      expiresAt: intro.expiresAt,
      clientId: intro.clientId,
      errorCode: intro.diagnosticCode,
      errorMessage: intro.diagnosticMessage,
    };
  }

  // Check OpenID profile scopes
  const hasOpenIdScopes = intro.scopes.includes('openid') && (intro.scopes.includes('profile') || intro.scopes.includes('email'));
  let profile: { name?: string; sub?: string; picture?: string; email?: string } | undefined;
  let profileLookupError: string | null = null;

  if (hasOpenIdScopes) {
    try {
      const userRes = await httpClient.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 6000,
      });

      profile = {
        name: userRes.data?.name,
        sub: userRes.data?.sub,
        picture: userRes.data?.picture,
        email: userRes.data?.email,
      };
    } catch (userErr: any) {
      profileLookupError = userErr.response?.data?.message || userErr.message;
    }
  }

  let warning: string | undefined;
  if (!hasOpenIdScopes || profileLookupError) {
    warning =
      "Token verified with active publishing permission ('w_member_social'). Member profile lookup was skipped because the token does not include OpenID Connect ('openid profile') scopes.";
  }

  return {
    valid: true,
    active: true,
    scopes: intro.scopes,
    hasPublishPermission: true,
    hasOpenIdScopes: !!profile,
    expiresAt: intro.expiresAt,
    clientId: intro.clientId,
    profile,
    warning,
  };
}
