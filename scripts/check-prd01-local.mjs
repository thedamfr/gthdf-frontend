import assert from 'node:assert/strict';

import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const baseUrl = process.env.LOCAL_FRONTEND_URL || 'http://localhost:3000';
const previewSecret = process.env.PREVIEW_SECRET;

if (!previewSecret) {
  throw new Error('PREVIEW_SECRET est requis pour le smoke test PRD 01.');
}

async function request(pathname, options) {
  return fetch(new URL(pathname, baseUrl), options);
}

async function responseText(pathname, expectedStatus) {
  const response = await request(pathname, { redirect: 'manual' });
  assert.equal(
    response.status,
    expectedStatus,
    `${pathname} devait répondre ${expectedStatus}, reçu ${response.status}`
  );
  return response.text();
}

function visibleText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const saintOmerHtml = await responseText('/villes/saint-omer', 200);
const saintOmerText = visibleText(saintOmerHtml);
assert.ok(
  saintOmerText.includes('Saint-Omer à vélo sur le Grand Tour des Hauts-de-France'),
  'Le H1 de Saint-Omer doit être présent dans le HTML initial.'
);
assert.ok(saintOmerText.includes('Calais Saint-Omer'));
assert.ok(saintOmerText.includes('Saint-Omer - Lille 2.0'));

await responseText('/villes/calais', 200);
await responseText('/villes/lille', 404);
await responseText('/villes/ville-inconnue', 404);

const chapterHtml = await responseText('/chapitres/calais-saint-omer', 200);
const chapterText = visibleText(chapterHtml);
assert.ok(
  chapterText.includes(
    'Ce chapitre relie Calais à Saint-Omer en passant notamment par Lille, Bailleul et Cassel.'
  ),
  'Le résumé des villes doit être présent dans le HTML initial.'
);
const checkpointHeadingIndex = chapterHtml.search(/<h2[^>]*>Checkpoints<\/h2>/);
const citiesHeadingIndex = chapterHtml.search(/<h2[^>]*>Villes traversées<\/h2>/);
assert.ok(checkpointHeadingIndex >= 0, 'Le titre Checkpoints doit être présent.');
assert.ok(
  citiesHeadingIndex > checkpointHeadingIndex,
  'Les villes traversées doivent être regroupées après les checkpoints, hors du haut de page.'
);
assert.match(chapterHtml, /href="\/villes\/calais"/);
assert.match(chapterHtml, /href="\/villes\/saint-omer"/);
assert.doesNotMatch(chapterHtml, /href="\/villes\/(?:lille|bailleul|cassel)"/);

const sitemap = await responseText('/sitemap.xml', 200);
assert.match(sitemap, /\/villes\/saint-omer/);
assert.match(sitemap, /\/villes\/calais/);
assert.doesNotMatch(sitemap, /\/villes\/(?:lille|bailleul|cassel)/);

await responseText('/api/preview?url=/villes/lille&status=draft', 401);

const externalPreviewParams = new URLSearchParams({
  url: 'https://example.com/villes/lille',
  status: 'draft',
  secret: previewSecret,
});
await responseText(`/api/preview?${externalPreviewParams}`, 400);

const previewParams = new URLSearchParams({
  url: '/villes/lille',
  status: 'draft',
  secret: previewSecret,
});
const previewResponse = await request(`/api/preview?${previewParams}`, {
  redirect: 'manual',
});
assert.equal(previewResponse.status, 307);
assert.equal(
  previewResponse.headers.get('referrer-policy'),
  'no-referrer',
  'La redirection de preview ne doit pas transmettre son URL contenant le secret.'
);

const previewLocation = previewResponse.headers.get('location');
assert.ok(previewLocation, 'La preview doit rediriger vers la page demandée.');
assert.equal(new URL(previewLocation, baseUrl).pathname, '/villes/lille');

const previewCookies = typeof previewResponse.headers.getSetCookie === 'function'
  ? previewResponse.headers.getSetCookie()
  : [previewResponse.headers.get('set-cookie')].filter(Boolean);
const cookieHeader = previewCookies
  .map((cookie) => cookie.split(';', 1)[0])
  .join('; ');
assert.ok(cookieHeader, 'La preview doit activer le Draft Mode avec un cookie.');

const previewPage = await request('/villes/lille', {
  headers: { cookie: cookieHeader },
});
assert.equal(previewPage.status, 200);
const previewHtml = await previewPage.text();
assert.ok(
  visibleText(previewHtml).includes(
    'Lille à vélo sur le Grand Tour des Hauts-de-France'
  ),
  'La preview doit rendre le brouillon de Lille.'
);
assert.match(previewHtml, /name="robots" content="noindex, nofollow"/);

console.log(JSON.stringify({
  publicCities: ['saint-omer', 'calais'],
  privateCitiesReturning404: ['lille', 'bailleul', 'cassel'],
  chapterSummary: 'server-rendered',
  sitemap: 'eligible cities only',
  preview: 'authenticated draft with noindex',
}, null, 2));
