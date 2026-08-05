import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTrustedMediaUrl } from '../lib/trusted-media-url.ts';

test('resolveTrustedMediaUrl accepts relative Strapi media and configured object storage', () => {
  assert.equal(
    resolveTrustedMediaUrl('/uploads/trace.gpx', 'https://cms.gthf.fr'),
    'https://cms.gthf.fr/uploads/trace.gpx'
  );
  assert.equal(
    resolveTrustedMediaUrl(
      'https://cellar-c2.services.clever-cloud.com/gthdf-media/trace.gpx',
      'https://cms.gthf.fr',
      ['https://cellar-c2.services.clever-cloud.com']
    ),
    'https://cellar-c2.services.clever-cloud.com/gthdf-media/trace.gpx'
  );
});

test('resolveTrustedMediaUrl rejects arbitrary hosts, credentials and non-http protocols', () => {
  for (const mediaUrl of [
    'https://example.com/trace.gpx',
    'https://user:password@cms.gthf.fr/trace.gpx',
    'file:///etc/passwd',
  ]) {
    assert.throws(
      () => resolveTrustedMediaUrl(mediaUrl, 'https://cms.gthf.fr'),
      /media URL is not trusted/i
    );
  }
});
