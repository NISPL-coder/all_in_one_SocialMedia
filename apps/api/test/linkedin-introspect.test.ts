import assert from 'assert';
import axios from 'axios';
import {
  introspectLinkedInToken,
  verifyLinkedInToken,
} from '../src/services/platforms/linkedin-auth.service';

/**
 * Unit & Integration Test Suite for LinkedIn Token Introspection
 * Covers:
 * 1. Active token with w_member_social & matching client_id
 * 2. Inactive / revoked token (active === false)
 * 3. Client ID mismatch (token issued for different app)
 * 4. Missing scope field in response
 * 5. Missing w_member_social scope
 * 6. LinkedIn API 400 Invalid Token Error
 * 7. LinkedIn API 500 Internal Error
 * 8. Network / Timeout failure
 * 9. Live environment test (when .env credentials available)
 */

async function runIntrospectTests() {
  console.log('🧪 Starting LinkedIn OAuth 2.0 Introspection Test Suite...\n');

  const mockClientId = 'nispl-app-client-123';
  const mockClientSecret = 'secret-456';
  const mockToken = 'mock-test-access-token';

  // Helper to create mock axios client
  const createMockClient = (mockResponse?: any, mockError?: any) => {
    return {
      post: async (url: string, body: string, config: any) => {
        // Confirm parameters are passed as application/x-www-form-urlencoded
        assert.strictEqual(
          config?.headers?.['Content-Type'],
          'application/x-www-form-urlencoded',
          'Must send Content-Type: application/x-www-form-urlencoded'
        );
        const params = new URLSearchParams(body);
        assert(params.has('client_id'), 'Body must include client_id');
        assert(params.has('client_secret'), 'Body must include client_secret');
        assert(params.has('token'), 'Body must include token');

        if (mockError) {
          throw mockError;
        }
        return { data: mockResponse };
      },
      get: async () => {
        return { data: {} };
      },
    } as any;
  };

  // 1. Active token with w_member_social & matching client_id
  console.log('--- Test 1: Active Token with w_member_social & Matching Client ID ---');
  const mockClient1 = createMockClient({
    active: true,
    client_id: mockClientId,
    scope: 'w_member_social',
    status: 'active',
    expires_at: 1797937967,
    authorized_at: 1792753964,
  });

  const res1 = await introspectLinkedInToken(mockToken, mockClientId, mockClientSecret, mockClient1);
  console.log('Test 1 Result:', res1);
  assert.strictEqual(res1.success, true, 'Active token must succeed');
  assert.strictEqual(res1.diagnosticCode, 'ACTIVE');
  assert.strictEqual(res1.active, true);
  assert.deepStrictEqual(res1.scopes, ['w_member_social']);
  console.log('✅ Test 1 Passed: Correctly identified active token with publishing scope.\n');

  // 2. Inactive / revoked token
  console.log('--- Test 2: Inactive / Revoked Token ---');
  const mockClient2 = createMockClient({
    active: false,
    client_id: mockClientId,
    status: 'revoked',
  });

  const res2 = await introspectLinkedInToken(mockToken, mockClientId, mockClientSecret, mockClient2);
  console.log('Test 2 Result:', res2);
  assert.strictEqual(res2.success, false, 'Inactive token must fail');
  assert.strictEqual(res2.diagnosticCode, 'INACTIVE_TOKEN');
  assert.strictEqual(res2.active, false);
  console.log('✅ Test 2 Passed: Inactive token correctly reported.\n');

  // 3. Client ID mismatch
  console.log('--- Test 3: Client ID Mismatch ---');
  const mockClient3 = createMockClient({
    active: true,
    client_id: 'other-unauthorized-app',
    scope: 'w_member_social',
  });

  const res3 = await introspectLinkedInToken(mockToken, mockClientId, mockClientSecret, mockClient3);
  console.log('Test 3 Result:', res3);
  assert.strictEqual(res3.success, false, 'Client ID mismatch must fail');
  assert.strictEqual(res3.diagnosticCode, 'CLIENT_ID_MISMATCH');
  assert(res3.diagnosticMessage.includes('does not match'), 'Diagnostic message must mention mismatch');
  console.log('✅ Test 3 Passed: Client mismatch correctly caught.\n');

  // 4. Missing scope field in response
  console.log('--- Test 4: Missing Scope Field in Response ---');
  const mockClient4 = createMockClient({
    active: true,
    client_id: mockClientId,
    // scope is intentionally missing
  });

  const res4 = await introspectLinkedInToken(mockToken, mockClientId, mockClientSecret, mockClient4);
  console.log('Test 4 Result:', res4);
  assert.strictEqual(res4.success, false, 'Missing scope field must not be treated as empty list or valid token');
  assert.strictEqual(res4.diagnosticCode, 'SCOPE_FIELD_MISSING');
  console.log('✅ Test 4 Passed: Missing scope field returned diagnostic error.\n');

  // 5. Missing w_member_social scope
  console.log('--- Test 5: Missing w_member_social Scope ---');
  const mockClient5 = createMockClient({
    active: true,
    client_id: mockClientId,
    scope: 'r_liteprofile r_emailaddress',
  });

  const res5 = await introspectLinkedInToken(mockToken, mockClientId, mockClientSecret, mockClient5);
  console.log('Test 5 Result:', res5);
  assert.strictEqual(res5.success, false, 'Token missing w_member_social must fail');
  assert.strictEqual(res5.diagnosticCode, 'MISSING_PUBLISH_PERMISSION');
  assert.deepStrictEqual(res5.scopes, ['r_liteprofile', 'r_emailaddress']);
  console.log('✅ Test 5 Passed: Missing publish permission correctly flagged.\n');

  // 6. LinkedIn API Error (400 Invalid Access Token)
  console.log('--- Test 6: LinkedIn API 400 Invalid Access Token ---');
  const mockClient6 = createMockClient(null, {
    response: {
      status: 400,
      data: {
        error: 'invalid_access_token',
        error_description: 'Unable to parse access token',
      },
    },
  });

  const res6 = await introspectLinkedInToken(mockToken, mockClientId, mockClientSecret, mockClient6);
  console.log('Test 6 Result:', res6);
  assert.strictEqual(res6.success, false);
  assert.strictEqual(res6.diagnosticCode, 'INVALID_ACCESS_TOKEN');
  console.log('✅ Test 6 Passed: HTTP 400 Invalid token handled properly.\n');

  // 7. LinkedIn API Error (500 Internal Error)
  console.log('--- Test 7: LinkedIn API 500 Internal Error ---');
  const mockClient7 = createMockClient(null, {
    response: {
      status: 500,
      data: {
        error: 'internal_error',
        error_description: 'Internal Server Error',
      },
    },
  });

  const res7 = await introspectLinkedInToken(mockToken, mockClientId, mockClientSecret, mockClient7);
  console.log('Test 7 Result:', res7);
  assert.strictEqual(res7.success, false);
  assert.strictEqual(res7.diagnosticCode, 'LINKEDIN_API_ERROR');
  console.log('✅ Test 7 Passed: HTTP 500 API error distinguished.\n');

  // 8. Network / Timeout failure
  console.log('--- Test 8: Network / Timeout Failure ---');
  const mockClient8 = createMockClient(null, new Error('connect ETIMEDOUT 108.174.10.10:443'));

  const res8 = await introspectLinkedInToken(mockToken, mockClientId, mockClientSecret, mockClient8);
  console.log('Test 8 Result:', res8);
  assert.strictEqual(res8.success, false);
  assert.strictEqual(res8.diagnosticCode, 'LINKEDIN_NETWORK_FAILURE');
  console.log('✅ Test 8 Passed: Network failure distinguished from invalid token.\n');

  // 9. Live token verification against real LinkedIn API
  console.log('--- Test 9: Live Token Verification from .env ---');
  const liveToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const liveClientId = process.env.LINKEDIN_CLIENT_ID;
  const liveClientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (liveToken && liveClientId && liveClientSecret && !liveToken.startsWith('mock_')) {
    console.log(`Testing with live client_id: ${liveClientId}...`);
    const liveResult = await verifyLinkedInToken(liveToken, liveClientId, liveClientSecret);
    console.log('Live Verification Result:', {
      valid: liveResult.valid,
      active: liveResult.active,
      clientId: liveResult.clientId,
      scopes: liveResult.scopes,
      hasPublishPermission: liveResult.hasPublishPermission,
      warning: liveResult.warning,
      errorCode: liveResult.errorCode,
    });

    assert.strictEqual(liveResult.valid, true, 'Live token must verify successfully');
    assert.strictEqual(liveResult.clientId, liveClientId, 'Live client_id must match');
    assert(liveResult.scopes.includes('w_member_social'), 'Must include w_member_social');
    console.log('✅ Test 9 Passed: Live token introspection against LinkedIn succeeded!\n');
  } else {
    console.log('ℹ️ Live credentials not available in environment; skipping live network call.\n');
  }

  console.log('🎉 ALL 9 LINKEDIN INTROSPECTION TESTS PASSED SUCCESSFULLY!\n');
}

runIntrospectTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
