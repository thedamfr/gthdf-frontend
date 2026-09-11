import assert from 'node:assert/strict';
import test from 'node:test';
import { recipeMediaUrl } from '../infrastructure/delivery/media-policy.mjs';

test('production reads current CMS, S3 and legacy Cellar media while staging stays isolated', () => {
  assert.equal(recipeMediaUrl('/uploads/test.jpg', 'production').origin, 'https://cms.gthf.fr');
  for (const origin of ['https://gthdf-staging-media.s3.eu-west-par.io.cloud.ovh.net', 'https://cellar-c2.services.clever-cloud.com']) {
    assert.equal(recipeMediaUrl(origin + '/test.jpg', 'production').origin, origin);
    assert.throws(() => recipeMediaUrl(origin + '/test.jpg', 'staging'));
  }
  assert.throws(() => recipeMediaUrl('https://other.example/test.jpg', 'production'));
  assert.throws(() => recipeMediaUrl('https://user:password@cms.gthf.fr/uploads/test.jpg', 'production'));
});
