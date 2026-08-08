import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAllowedPreviewPath,
  isValidPreviewSecret,
} from '../lib/preview-security.ts';

test('isAllowedPreviewPath accepts only known internal routes', () => {
  assert.equal(isAllowedPreviewPath('/chapitres/saint-omer-calais'), true);
  assert.equal(isAllowedPreviewPath('/itineraires-velo/calais-boulogne-sur-mer'), true);
  assert.equal(isAllowedPreviewPath('https://example.com'), false);
  assert.equal(isAllowedPreviewPath('//example.com'), false);
  assert.equal(isAllowedPreviewPath('/chapitres/../../admin'), false);
});

test('isValidPreviewSecret accepts only an exact non-empty secret', () => {
  assert.equal(isValidPreviewSecret('secret-partage', 'secret-partage'), true);
  assert.equal(isValidPreviewSecret('secret-partage', 'secret-invalide'), false);
  assert.equal(isValidPreviewSecret('', ''), false);
});
