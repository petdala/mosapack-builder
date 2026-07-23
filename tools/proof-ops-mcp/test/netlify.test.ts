import assert from 'node:assert/strict';
import test from 'node:test';

import { actionableError, DEFAULT_SITE_ID, readNetlifyConfig } from '../src/netlify.js';

test('missing Netlify environment variables produce actionable setup guidance', () => {
  assert.throws(
    () => readNetlifyConfig({}),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return (
        message.includes('NETLIFY_AUTH_TOKEN') &&
        message.includes('NETLIFY_SITE_ID') &&
        message.includes(DEFAULT_SITE_ID) &&
        message.includes('Personal access tokens')
      );
    }
  );
});

test('authorization errors are actionable and never echo the configured token', () => {
  const token = 'secret-token-that-must-not-appear';
  const message = actionableError(
    new Error(`Netlify returned 401 Unauthorized for ${token}`),
    { NETLIFY_AUTH_TOKEN: token }
  );
  assert.match(message, /personal access token/i);
  assert.match(message, /team/i);
  assert.doesNotMatch(message, new RegExp(token));
});
