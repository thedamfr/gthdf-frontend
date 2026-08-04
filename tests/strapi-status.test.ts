import assert from 'node:assert/strict';
import test from 'node:test';

import { withStrapiStatus } from '../lib/strapi-status.ts';

test('withStrapiStatus uses the Strapi 5 draft status and removes the legacy parameter', () => {
  assert.deepEqual(
    withStrapiStatus({ publicationState: 'preview' }, true),
    { status: 'draft' }
  );
});
