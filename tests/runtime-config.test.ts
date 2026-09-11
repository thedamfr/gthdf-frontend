import assert from 'node:assert/strict';
import test from 'node:test';
import { runtimeUrls } from '../lib/runtime-config.ts';

test('the same server code resolves its URLs from the running environment', () => {
  const staging = runtimeUrls({ STRAPI_URL: 'https://staging-cms.gthf.fr', SITE_URL: 'https://staging.gthf.fr' });
  const production = runtimeUrls({ STRAPI_URL: 'https://cms.gthf.fr', SITE_URL: 'https://gthf.fr' });
  assert.equal(staging.strapi, 'https://staging-cms.gthf.fr');
  assert.equal(production.site, 'https://gthf.fr');
  assert.notEqual(staging.site, production.site);
});

test('legacy URL configuration remains available for existing installations', () => {
  assert.deepEqual(runtimeUrls({ NEXT_PUBLIC_STRAPI_URL: 'https://legacy.example', NEXT_PUBLIC_SITE_URL: 'https://site.example' }), {
    strapi: 'https://legacy.example', publicStrapi: 'https://legacy.example', site: 'https://site.example',
  });
  assert.deepEqual(runtimeUrls({}), { strapi: 'http://localhost:1337', publicStrapi: 'http://localhost:1337', site: 'https://gthf.fr' });
});

test('internal CMS traffic does not expose its cluster URL in public media links', () => {
  const urls = runtimeUrls({ STRAPI_URL: 'http://gthdf-cms:1337', PUBLIC_STRAPI_URL: 'https://staging-cms.gthf.fr' });
  assert.equal(urls.strapi, 'http://gthdf-cms:1337');
  assert.equal(urls.publicStrapi, 'https://staging-cms.gthf.fr');
});
