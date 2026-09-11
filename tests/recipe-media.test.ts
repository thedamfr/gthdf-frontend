import assert from 'node:assert/strict';
import test from 'node:test';
import { recipeMediaUrl } from '../infrastructure/delivery/media-policy.mjs';
import { uploadPng } from '../infrastructure/delivery/upload-fixture.mjs';
import sharp from 'sharp';

test('the upload fixture can be decoded and resized by the CMS image pipeline', async () => {
  const { width, height, format } = await sharp(uploadPng).metadata();
  assert.deepEqual({ width, height, format }, { width: 1, height: 1, format: 'png' });
  assert.ok((await sharp(uploadPng).resize(2, 2).png().toBuffer()).byteLength > 0);
});

test('staging media requires HTTPS origins and the CMS uploads directory', () => {
  assert.equal(recipeMediaUrl('/uploads/test.jpg', 'staging').pathname, '/uploads/test.jpg');
  const bucket = 'gthf-staging-media-bis.s3.gra.io.cloud.ovh.net';
  assert.equal(recipeMediaUrl('https://' + bucket + '/test.jpg', 'staging').hostname, bucket);
  for (const value of ['/admin', '/api/articles', '/uploads/../admin', 'http://' + bucket + '/test.jpg', 'https://' + bucket + ':8443/test.jpg']) {
    assert.throws(() => recipeMediaUrl(value, 'staging'), value);
  }
});

test('production reads current CMS, S3 and legacy Cellar media while staging stays isolated', () => {
  assert.equal(recipeMediaUrl('/uploads/test.jpg', 'production').origin, 'https://cms.gthf.fr');
  for (const origin of ['https://gthdf-staging-media.s3.eu-west-par.io.cloud.ovh.net', 'https://cellar-c2.services.clever-cloud.com']) {
    assert.equal(recipeMediaUrl(origin + '/test.jpg', 'production').origin, origin);
    assert.throws(() => recipeMediaUrl(origin + '/test.jpg', 'staging'));
  }
  assert.throws(() => recipeMediaUrl('https://other.example/test.jpg', 'production'));
  assert.throws(() => recipeMediaUrl('https://user:password@cms.gthf.fr/uploads/test.jpg', 'production'));
});
