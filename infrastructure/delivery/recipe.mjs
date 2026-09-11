import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { requireIsolatedSecrets } from './secret-isolation.mjs';
import { requireStagingConfiguration } from './configuration-isolation.mjs';
import { recipeMediaUrl } from './media-policy.mjs';
import { cleanupRecipeData } from './recipe-cleanup.mjs';

const environment = process.argv[2];
if (!['staging', 'production'].includes(environment)) throw new Error('A named environment is required');
const staging = environment === 'staging';
const namespace = staging ? 'gthdf-qualification' : 'gthdf-staging';
const origins = staging ? { cms: 'https://staging-cms.gthf.fr', frontend: 'https://staging.gthf.fr' } : { cms: 'https://cms.gthf.fr', frontend: 'https://gthf.fr' };
const kube = (ns, ...args) => JSON.parse(execFileSync('sudo', ['-n', '/snap/bin/microk8s', 'kubectl', '-n', ns, ...args, '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const secrets = kube(namespace, 'get', 'secret', 'gthdf-secrets').data;
const privateValue = (key) => Buffer.from(secrets[key], 'base64').toString();
const apiToken = privateValue('STRAPI_API_TOKEN');
const cookies = {};
let step = 'initialization';

async function request(origin, path, options = {}) {
  if (!Object.values(origins).includes(origin)) throw new Error('Unexpected application origin');
  if (!staging && options.method && options.method !== 'GET') throw new Error('Production recipes are read-only');
  const response = await fetch(origin + path, {
    ...options,
    headers: { 'User-Agent': 'gthdf-delivery', ...(cookies[origin] ? { Cookie: cookies[origin] } : {}), ...options.headers },
    redirect: options.redirect ?? 'error',
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok && !options.allowStatus?.includes(response.status)) throw new Error('Unexpected HTTP response');
  return response;
}

async function cms(path, options = {}) {
  return (await request(origins.cms, path, { ...options, headers: { Authorization: 'Bearer ' + apiToken, ...options.headers } })).json();
}

function requireIsolation() {
  const productionConfig = kube('gthdf-staging', 'get', 'configmap', 'gthdf-config').data;
  const stageConfig = kube(namespace, 'get', 'configmap', 'gthdf-config').data;
  const productionSecrets = kube('gthdf-staging', 'get', 'secret', 'gthdf-secrets').data;
  requireStagingConfiguration(stageConfig);
  assert.notEqual(stageConfig.AWS_BUCKET, productionConfig.AWS_BUCKET);
  requireIsolatedSecrets(secrets, productionSecrets);
  const prodVolume = kube('gthdf-staging', 'get', 'pvc', 'gthdf-postgres');
  const stageVolume = kube(namespace, 'get', 'pvc', 'gthdf-postgres');
  assert.notEqual(prodVolume.spec.volumeName, stageVolume.spec.volumeName);
  const workloads = kube(namespace, 'get', 'deployment', 'gthdf-cms', 'gthdf-frontend');
  for (const workload of workloads.items) {
    for (const container of workload.spec.template.spec.containers) {
      assert.ok(!(container.env ?? []).some((variable) => /^(DATABASE_URL|POSTGRESQL_ADDON_)/.test(variable.name)));
    }
  }
}

async function loginGateway(password) {
  for (const origin of Object.values(origins)) {
    const response = await request(origin, '/_gateway/login', {
      method: 'POST', body: new URLSearchParams({ password }), redirect: 'manual', allowStatus: [303],
    });
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith('gthdf_staging_session='));
    assert.ok(cookie);
    cookies[origin] = cookie.split(';')[0];
  }
}

async function publicRecipe() {
  step = 'published chapter and media';
  const chapters = await cms('/api/chapters?status=published&pagination[pageSize]=1&populate[gpxFileAB]=true&populate[thumbnail]=true');
  const chapter = chapters.data?.[0];
  assert.ok(chapter?.slug && chapter.title);
  const page = await (await request(origins.frontend, '/chapitres/' + encodeURIComponent(chapter.slug))).text();
  assert.ok(page.replaceAll('&amp;', '&').includes(chapter.title));
  assert.ok(page.includes('<h1'));
  const media = chapter.gpxFileAB?.url || chapter.thumbnail?.url;
  assert.ok(media);
  const mediaUrl = recipeMediaUrl(media, environment);
  const mediaResponse = await fetch(mediaUrl, { headers: { Range: 'bytes=0-1023', ...(cookies[mediaUrl.origin] ? { Cookie: cookies[mediaUrl.origin] } : {}) }, redirect: 'error', signal: AbortSignal.timeout(20000) });
  assert.ok(mediaResponse.ok);
  assert.ok((await mediaResponse.arrayBuffer()).byteLength > 0);
  step = 'public city and itinerary catalogue';
  const city = (await cms('/api/cities?status=published&filters[hasPublicPage][$eq]=true&pagination[pageSize]=1')).data?.[0];
  assert.ok(city?.slug);
  assert.ok((await (await request(origins.frontend, '/villes/' + encodeURIComponent(city.slug))).text()).includes('<h1'));
  const catalogue = await (await request(origins.frontend, '/itineraires-velo')).text();
  const itinerary = /href="(\/itineraires-velo\/[^"?#]+)"/.exec(catalogue)?.[1];
  assert.ok(itinerary);
  const itineraryPage = await (await request(origins.frontend, itinerary)).text();
  assert.ok(itineraryPage.includes('<h1'));
  const gpx = await request(origins.frontend, itinerary + '/gpx');
  assert.ok((await gpx.text()).includes('<gpx'));
}

async function writeRecipe(credentials) {
  step = 'administration login';
  const session = await (await request(origins.cms, '/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  })).json();
  const adminToken = session.data?.token;
  assert.ok(adminToken);
  const admin = async (path, method, body) => {
    const response = await request(origins.cms, path, { method, headers: { Authorization: 'Bearer ' + adminToken, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return response.status === 204 ? null : response.json();
  };
  const authors = await cms('/api/authors?pagination[pageSize]=1');
  const categories = await cms('/api/categories?pagination[pageSize]=1');
  assert.ok(authors.data?.[0]?.documentId && categories.data?.[0]?.documentId);
  const slug = 'recette-livraison-' + Date.now();
  const model = '/content-manager/collection-types/api::article.article';
  let documentId;
  let uploaded;
  try {
    step = 'create and edit a draft';
    const article = await admin(model, 'POST', {
      title: slug, slug, description: 'Document temporaire de recette.',
      author: { connect: [{ documentId: authors.data[0].documentId }] },
      category: { connect: [{ documentId: categories.data[0].documentId }] },
    });
    documentId = article.data?.documentId ?? article.documentId;
    assert.ok(documentId);
    await admin(model + '/' + documentId, 'PUT', { title: slug + ' modifié' });
    step = 'protected preview';
    const preview = await request(origins.frontend, '/api/preview?' + new URLSearchParams({ url: '/article/' + slug, status: 'draft', secret: privateValue('PREVIEW_SECRET') }), { redirect: 'manual', allowStatus: [307, 302] });
    const draftCookies = preview.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
    assert.ok(draftCookies.includes('__prerender_bypass='));
    const previewPage = await request(origins.frontend, '/article/' + slug, { headers: { Cookie: cookies[origins.frontend] + '; ' + draftCookies } });
    assert.ok((await previewPage.text()).includes(slug));
    step = 'publish and read through Next.js';
    await admin(model + '/' + documentId + '/actions/publish', 'POST', {});
    const published = await request(origins.frontend, '/article/' + slug);
    assert.ok((await published.text()).includes(slug));
    step = 'upload and read media';
    const form = new FormData();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6rQAAAABJRU5ErkJggg==', 'base64');
    form.set('files', new Blob([png], { type: 'image/png' }), slug + '.png');
    const upload = await (await request(origins.cms, '/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: form })).json();
    uploaded = upload[0];
    assert.ok(uploaded?.id && uploaded.url);
    const mediaUrl = recipeMediaUrl(uploaded.url, environment);
    const response = await fetch(mediaUrl, { headers: cookies[mediaUrl.origin] ? { Cookie: cookies[mediaUrl.origin] } : {}, signal: AbortSignal.timeout(20000), redirect: 'error' });
    assert.ok(response.ok);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  } finally {
    await cleanupRecipeData(
      async () => { if (documentId) await admin(model + '/' + documentId, 'DELETE'); },
      async () => { if (uploaded?.id) await admin('/upload/files/' + uploaded.id, 'DELETE'); },
    );
  }
}

try {
  if (staging) {
    step = 'isolation'; requireIsolation();
    const credentials = JSON.parse(readFileSync('/home/ubuntu/gthdf-delivery/staging-access.json', 'utf8'));
    await loginGateway(credentials.gatewayPassword);
    await publicRecipe();
    await writeRecipe(credentials);
  } else {
    await publicRecipe();
  }
  console.log(JSON.stringify({ environment, status: 'passed', productionWrites: 0, checkedAt: new Date().toISOString() }));
} catch {
  console.error(`GTHF recipe failed during: ${step}`);
  process.exitCode = 1;
}
