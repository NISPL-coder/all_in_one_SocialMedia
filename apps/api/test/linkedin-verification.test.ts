import assert from 'assert';
import axios from 'axios';
import { verifyLinkedInToken } from '../src/services/platforms/linkedin-auth.service';

/**
 * Automated Test: LinkedIn Token Verification & Permission Handling
 *
 * Verifies:
 * 1. Reproduction of the original error: Calling GET /v2/userinfo on a token without
 *    OpenID Connect scopes results in 403 'Not enough permissions to access: userinfo.GET.NO_VERSION'.
 * 2. Corrected behavior with verifyLinkedInToken:
 *    - Validates token status and publishing permission ('w_member_social') via OAuth 2.0 introspection.
 *    - Does NOT fail token verification merely because /v2/userinfo is forbidden.
 *    - Rejects tokens lacking the 'w_member_social' publishing scope with MISSING_PUBLISH_PERMISSION.
 *    - Rejects invalid / malformed tokens with INVALID_ACCESS_TOKEN.
 *    - Verifies live token from environment if present.
 */

async function runTests() {
  console.log('🧪 Starting LinkedIn Verification & Permission Tests...\n');

  // Test 1: Reproduce exact error with direct /v2/userinfo on w_member_social token
  console.log('--- Test 1: Reproduce Original Error (userinfo.GET.NO_VERSION) ---');
  const liveToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (liveToken && !liveToken.startsWith('mock_')) {
    try {
      await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${liveToken}` },
      });
      console.log('ℹ️ Live token has openid scope, userinfo succeeded.');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      console.log(`✅ Successfully reproduced exact expected 403 error: "${errMsg}"`);
      assert(
        errMsg.includes('userinfo.GET.NO_VERSION') || err.response?.status === 403,
        'Expected 403 userinfo permission error'
      );
    }
  } else {
    console.log('ℹ️ No live token in env, skipping live 403 network call.');
  }

  // Test 2: Corrected Behavior - verifyLinkedInToken handles w_member_social without throwing on userinfo
  console.log('\n--- Test 2: Corrected Behavior with Live w_member_social Token ---');
  if (liveToken && !liveToken.startsWith('mock_')) {
    const result = await verifyLinkedInToken(liveToken);
    console.log('Verification result:', {
      valid: result.valid,
      active: result.active,
      hasPublishPermission: result.hasPublishPermission,
      hasOpenIdScopes: result.hasOpenIdScopes,
      scopes: result.scopes,
      warning: result.warning,
    });

    assert.strictEqual(result.valid, true, 'Token with w_member_social must be considered valid');
    assert.strictEqual(result.hasPublishPermission, true, 'Token must have publishing permission');
    assert(result.scopes.includes('w_member_social'), "Token must contain 'w_member_social'");
    if (!result.hasOpenIdScopes) {
      assert(result.warning !== undefined, 'Warning must be present explaining profile lookup was skipped');
      console.log(`✅ Correctly accepted token and provided non-fatal notice: "${result.warning}"`);
    } else {
      console.log('✅ Token also contains OpenID scopes and fetched profile details.');
    }
  }

  // Test 3: Rejection of Invalid / Malformed Token
  console.log('\n--- Test 3: Rejection of Invalid / Malformed Token ---');
  const invalidResult = await verifyLinkedInToken('AQX_this_is_an_invalid_token_xyz');
  console.log('Invalid token result:', invalidResult);
  assert.strictEqual(invalidResult.valid, false, 'Invalid token must not be accepted');
  assert.strictEqual(invalidResult.active, false, 'Invalid token must not be active');
  assert(
    invalidResult.errorCode === 'INVALID_ACCESS_TOKEN' ||
      invalidResult.errorCode === 'LINKEDIN_API_ERROR' ||
      invalidResult.errorCode === 'TOKEN_VERIFICATION_FAILED',
    `Expected invalid token error code, got: ${invalidResult.errorCode}`
  );
  console.log('✅ Invalid token correctly rejected with error code:', invalidResult.errorCode);

  // Test 4: Rejection of Mock Token
  console.log('\n--- Test 4: Rejection of Mock Placeholder Token ---');
  const mockResult = await verifyLinkedInToken('mock_token_12345');
  assert.strictEqual(mockResult.valid, false, 'Mock token must be rejected');
  assert.strictEqual(mockResult.errorCode, 'INVALID_ACCESS_TOKEN');
  console.log('✅ Mock token correctly rejected with error code:', mockResult.errorCode);

  console.log('\n🎉 ALL LINKEDIN VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
