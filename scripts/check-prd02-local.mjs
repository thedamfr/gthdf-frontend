import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';

import { classifyChapterProximity } from '../lib/chapter-proximity.ts';

const EXPECTED_CHAPTER_COUNT = 10;
const INDEX_GZIP_TARGET_BYTES = 250 * 1024;
const INDEX_GZIP_LIMIT_BYTES = 500 * 1024;
const CALCULATION_BUDGET_MS = 500;
const DEFAULT_BENCHMARK_ITERATIONS = 20;
const REQUEST_TIMEOUT_MS = 120_000;

function localBaseUrl() {
  const url = new URL(process.env.LOCAL_FRONTEND_URL || 'http://localhost:3000');
  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

  assert.ok(
    loopbackHosts.has(url.hostname),
    'LOCAL_FRONTEND_URL doit cibler localhost ou une adresse loopback.'
  );
  assert.ok(
    url.protocol === 'http:' || url.protocol === 'https:',
    'LOCAL_FRONTEND_URL doit utiliser HTTP ou HTTPS.'
  );
  assert.equal(url.username, '', 'LOCAL_FRONTEND_URL ne doit pas contenir de login.');
  assert.equal(url.password, '', 'LOCAL_FRONTEND_URL ne doit pas contenir de mot de passe.');
  assert.equal(url.search, '', 'LOCAL_FRONTEND_URL ne doit pas contenir de query string.');
  assert.equal(url.hash, '', 'LOCAL_FRONTEND_URL ne doit pas contenir de fragment.');

  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url;
}

function benchmarkIterations() {
  const configuredValue = Number(process.env.PRD02_BENCHMARK_ITERATIONS);

  if (!process.env.PRD02_BENCHMARK_ITERATIONS) {
    return DEFAULT_BENCHMARK_ITERATIONS;
  }

  assert.ok(
    Number.isInteger(configuredValue) && configuredValue >= 5 && configuredValue <= 200,
    'PRD02_BENCHMARK_ITERATIONS doit être un entier compris entre 5 et 200.'
  );
  return configuredValue;
}

const baseUrl = localBaseUrl();

async function request(pathname) {
  const requestUrl = new URL(pathname, baseUrl);
  assert.equal(
    requestUrl.origin,
    baseUrl.origin,
    'La recette PRD02 ne peut appeler que le serveur frontend local.'
  );

  return fetch(requestUrl, {
    headers: { Accept: 'text/html, application/json;q=0.9' },
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function responseWithStatus(pathname, expectedStatus) {
  const response = await request(pathname);
  assert.equal(
    response.status,
    expectedStatus,
    `${pathname} devait répondre ${expectedStatus}, reçu ${response.status}.`
  );
  return response;
}

function visibleText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chapterLinks(html) {
  const links = [];

  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attributes = match[1];
    const href = attributes.match(/\bhref=["']\/chapitres\/([^"']+)["']/i)?.[1];
    if (!href) {
      continue;
    }

    const text = visibleText(match[2]);
    const displayOrder = Number(text.match(/\bChapitre\s+(\d+)\b/i)?.[1]);
    assert.ok(
      Number.isInteger(displayOrder),
      `Le lien /chapitres/${href} doit afficher son numéro de chapitre.`
    );
    links.push({ href, displayOrder });
  }

  return links;
}

function assertProximityIndex(value) {
  assert.ok(value && typeof value === 'object', 'L’index doit être un objet JSON.');
  assert.equal(value.schemaVersion, 1, 'La version publique de l’index doit être 1.');
  assert.equal(typeof value.revision, 'string', 'L’index doit exposer une révision.');
  assert.ok(value.revision.length > 0, 'La révision de l’index ne doit pas être vide.');
  assert.equal(typeof value.partial, 'boolean', 'L’état partiel de l’index doit être explicite.');
  assert.ok(Array.isArray(value.chapters), 'L’index doit exposer un tableau de chapitres.');
  assert.equal(
    value.chapters.length,
    EXPECTED_CHAPTER_COUNT,
    `L’index doit contenir ${EXPECTED_CHAPTER_COUNT} chapitres.`
  );

  const orders = value.chapters.map((chapter) => chapter.displayOrder);
  assert.deepEqual(
    orders,
    Array.from({ length: EXPECTED_CHAPTER_COUNT }, (_, index) => index + 1),
    'Les chapitres de l’index doivent suivre displayOrder 1 à 10.'
  );

  return value;
}

function firstBenchmarkPoint(index) {
  for (const chapter of index.chapters) {
    for (const trace of chapter.traces || []) {
      for (const segment of trace.segments || []) {
        const point = segment[0];
        if (
          Array.isArray(point)
          && point.length === 2
          && point.every((coordinate) => Number.isFinite(coordinate))
        ) {
          return point;
        }
      }
    }
  }

  assert.fail('L’index doit contenir au moins un point pour le benchmark.');
}

function percentile(sortedValues, ratio) {
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * ratio) - 1)
  );
  return sortedValues[index];
}

function benchmarkCalculation(index, iterations) {
  const point = firstBenchmarkPoint(index);

  for (let warmup = 0; warmup < 3; warmup += 1) {
    classifyChapterProximity(point, 20, index.chapters);
  }

  const durations = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const start = performance.now();
    const classification = classifyChapterProximity(point, 20, index.chapters);
    durations.push(performance.now() - start);
    assert.ok(
      classification.results.length > 0,
      'Le point public de référence doit produire au moins un chapitre.'
    );
  }

  durations.sort((first, second) => first - second);
  const medianMs = percentile(durations, 0.5);
  const p95Ms = percentile(durations, 0.95);
  const maxMs = durations[durations.length - 1];

  assert.ok(
    medianMs <= CALCULATION_BUDGET_MS,
    `Le calcul médian local (${medianMs.toFixed(1)} ms) dépasse le budget de ${CALCULATION_BUDGET_MS} ms.`
  );

  return {
    iterations,
    medianMs: Number(medianMs.toFixed(2)),
    p95Ms: Number(p95Ms.toFixed(2)),
    maxMs: Number(maxMs.toFixed(2)),
    localSmokeBudgetMs: CALCULATION_BUDGET_MS,
  };
}

const chaptersResponse = await responseWithStatus('/chapitres', 200);
const chaptersHtml = await chaptersResponse.text();
const chaptersText = visibleText(chaptersHtml);
const noScriptHtml = chaptersHtml.match(/<noscript>([\s\S]*?)<\/noscript>/i)?.[1] ?? '';
const interactiveHtml = chaptersHtml.replace(/<noscript>[\s\S]*?<\/noscript>/gi, ' ');

assert.ok(chaptersText.includes('Les chapitres'), 'Le H1 doit être présent dans le HTML initial.');
assert.ok(
  chaptersText.includes('Trouver un chapitre'),
  'Le finder doit être présent dans le HTML initial.'
);

const links = chapterLinks(interactiveHtml);
const noScriptLinks = chapterLinks(noScriptHtml);
assert.equal(
  links.length,
  EXPECTED_CHAPTER_COUNT,
  `Le HTML initial doit contenir exactement ${EXPECTED_CHAPTER_COUNT} liens de chapitre.`
);
assert.deepEqual(
  links.map(({ displayOrder }) => displayOrder),
  Array.from({ length: EXPECTED_CHAPTER_COUNT }, (_, index) => index + 1),
  'Les liens HTML doivent suivre displayOrder 1 à 10.'
);
assert.equal(
  new Set(links.map(({ href }) => href)).size,
  EXPECTED_CHAPTER_COUNT,
  'Chaque lien de chapitre doit être unique.'
);
assert.equal(
  noScriptLinks.length,
  EXPECTED_CHAPTER_COUNT,
  `Le fallback sans JavaScript doit contenir exactement ${EXPECTED_CHAPTER_COUNT} liens de chapitre.`
);
assert.deepEqual(
  noScriptLinks,
  links,
  'Le fallback sans JavaScript doit reprendre les mêmes chapitres dans le même ordre.'
);
assert.doesNotMatch(
  chaptersHtml,
  /<img\b/i,
  'Aucune image de la galerie desktop ne doit être rendue dans le HTML initial.'
);
assert.doesNotMatch(
  chaptersHtml,
  /\/_next\/image\?/i,
  'Le HTML initial ne doit contenir aucune ressource Next Image de la galerie.'
);

const indexResponse = await responseWithStatus('/api/chapters/proximity-index', 200);
const indexBytes = new Uint8Array(await indexResponse.arrayBuffer());
const indexText = new TextDecoder().decode(indexBytes);
const index = assertProximityIndex(JSON.parse(indexText));

await responseWithStatus('/api/chapters/proximity-index?probe=1', 400);

const gzipBytes = gzipSync(indexBytes).byteLength;
assert.ok(
  gzipBytes <= INDEX_GZIP_LIMIT_BYTES,
  `L’index compressé (${gzipBytes} octets) dépasse la limite de ${INDEX_GZIP_LIMIT_BYTES} octets.`
);

const benchmark = benchmarkCalculation(index, benchmarkIterations());

console.log(JSON.stringify({
  html: {
    status: chaptersResponse.status,
    chapterLinks: links.length,
    displayOrder: links.map(({ displayOrder }) => displayOrder),
    galleryImagesInInitialHtml: 0,
  },
  proximityIndex: {
    status: indexResponse.status,
    queryRejectedWith: 400,
    chapters: index.chapters.length,
    partial: index.partial,
    jsonBytes: indexBytes.byteLength,
    gzipBytes,
    gzipKilobytes: Number((gzipBytes / 1024).toFixed(1)),
    targetKilobytes: INDEX_GZIP_TARGET_BYTES / 1024,
    limitKilobytes: INDEX_GZIP_LIMIT_BYTES / 1024,
    meetsTarget: gzipBytes <= INDEX_GZIP_TARGET_BYTES,
  },
  calculationBenchmark: benchmark,
}, null, 2));
