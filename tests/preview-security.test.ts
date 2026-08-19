import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAllowedPreviewPath,
  isValidPreviewSecret,
  resolveSafePreviewExitUrl,
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

test('resolveSafePreviewExitUrl keeps redirects on the current origin', () => {
  const requestUrl = 'https://gthf.fr/api/preview/exit';

  assert.equal(
    resolveSafePreviewExitUrl('/itineraires-velo/calais-boulogne-sur-mer', requestUrl)?.toString(),
    'https://gthf.fr/itineraires-velo/calais-boulogne-sur-mer'
  );
  assert.equal(
    resolveSafePreviewExitUrl('/blog?category=voyage#articles', requestUrl)?.toString(),
    'https://gthf.fr/blog?category=voyage#articles'
  );
  assert.equal(resolveSafePreviewExitUrl(null, requestUrl)?.toString(), 'https://gthf.fr/');

  for (const unsafeUrl of [
    'https://example.com',
    '//example.com',
    '///example.com',
    '/\\example.com',
    '/\\\\example.com',
  ]) {
    assert.equal(resolveSafePreviewExitUrl(unsafeUrl, requestUrl), null);
  }
});
