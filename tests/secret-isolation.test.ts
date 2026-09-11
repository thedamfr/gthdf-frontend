import assert from 'node:assert/strict';
import test from 'node:test';
import { requireIsolatedSecrets } from '../infrastructure/delivery/secret-isolation.mjs';

test('staging requires all application secrets to differ while allowing the dedicated GTHF S3 identity', () => {
  const keys = ['POSTGRES_PASSWORD', 'APP_KEYS', 'API_TOKEN_SALT', 'ADMIN_JWT_SECRET', 'TRANSFER_TOKEN_SALT', 'ENCRYPTION_KEY', 'JWT_SECRET', 'PREVIEW_SECRET', 'STRAPI_API_TOKEN'];
  const staging = Object.fromEntries(keys.map(key => [key, 'stage-fixture-' + key]));
  const production = Object.fromEntries(keys.map(key => [key, 'prod-fixture-' + key]));
  requireIsolatedSecrets({ ...staging, AWS_SECRET_ACCESS_KEY: 'shared-fixture' }, { ...production, AWS_SECRET_ACCESS_KEY: 'shared-fixture' });
  for (const key of keys) {
    for (const unsafe of [undefined, production[key]]) {
      assert.throws(() => requireIsolatedSecrets({ ...staging, [key]: unsafe }, production), error => {
        assert.equal((error as Error).message, 'Staging secret isolation failed: ' + key);
        return true;
      });
    }
  }
});
