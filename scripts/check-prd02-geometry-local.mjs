import assert from 'node:assert/strict';

import {
  classifyChapterProximity,
  distanceToChapterMeters,
  rankChapterDistances,
} from '../lib/chapter-proximity.ts';
import {
  computeGeometryBoundingBox,
  parseGpxSegments,
} from '../lib/gpx-proximity-index.ts';

const EXPECTED_CHAPTERS = 10;
const EXPECTED_TRACES = 20;
const MAX_DISTANCE_ERROR_METERS = 25;
const WINNER_MARGIN_METERS = 50;
const REQUEST_TIMEOUT_MS = 120_000;

function localUrl(value, variableName, fallback) {
  const url = new URL(value || fallback);
  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

  assert.ok(loopbackHosts.has(url.hostname), `${variableName} doit cibler une adresse loopback.`);
  assert.ok(['http:', 'https:'].includes(url.protocol), `${variableName} doit utiliser HTTP ou HTTPS.`);
  assert.equal(url.username, '', `${variableName} ne doit pas contenir de login.`);
  assert.equal(url.password, '', `${variableName} ne doit pas contenir de mot de passe.`);
  assert.equal(url.search, '', `${variableName} ne doit pas contenir de query string.`);
  assert.equal(url.hash, '', `${variableName} ne doit pas contenir de fragment.`);

  return url;
}

function trustedMediaOrigins(cmsOrigin) {
  return new Set([
    cmsOrigin,
    'https://cellar-c2.services.clever-cloud.com',
    ...(process.env.STRAPI_MEDIA_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => new URL(origin).origin),
  ]);
}

function assertTrustedMediaUrl(value, cmsOrigin) {
  const url = new URL(value, `${cmsOrigin}/`);

  assert.ok(
    trustedMediaOrigins(cmsOrigin).has(url.origin),
    'La recette géométrique refuse une origine média non approuvée.'
  );
  assert.ok(['http:', 'https:'].includes(url.protocol), 'Un média doit utiliser HTTP ou HTTPS.');
  assert.equal(url.username, '', 'Une URL média ne doit pas contenir de login.');
  assert.equal(url.password, '', 'Une URL média ne doit pas contenir de mot de passe.');

  return url;
}

function queryUrl(cmsUrl) {
  const url = new URL('/api/chapters', cmsUrl);
  const query = new URLSearchParams({
    status: 'published',
    'fields[0]': 'documentId',
    'fields[1]': 'slug',
    'fields[2]': 'displayOrder',
    'populate[gpxFileAB][fields][0]': 'url',
    'populate[gpxFileBA][fields][0]': 'url',
    'pagination[pageSize]': '100',
  });
  url.search = query.toString();
  return url;
}

async function localFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function requiredResponse(url, options) {
  const response = await localFetch(url, options);
  assert.equal(response.status, 200, `${url.pathname} devait répondre 200, reçu ${response.status}.`);
  return response;
}

function traceChapter(chapter, trace) {
  return {
    documentId: chapter.documentId,
    slug: chapter.slug,
    displayOrder: chapter.displayOrder,
    boundingBox: trace.boundingBox,
    traces: [trace],
  };
}

function sampledPoints(segments, targetPerSegment = 24) {
  return segments.flatMap((segment) => {
    const step = Math.max(1, Math.floor(segment.length / targetPerSegment));
    const points = segment.filter((_, index) => index % step === 0);
    const last = segment.at(-1);

    if (last && points.at(-1) !== last) {
      points.push(last);
    }

    return points;
  });
}

function representativePoints(chapter) {
  const points = chapter.traces.flatMap((trace) => trace.segments.flatMap((segment) => {
    if (segment.length === 0) {
      return [];
    }

    return [segment[0], segment[Math.floor((segment.length - 1) / 2)], segment.at(-1)];
  }));

  const unique = new Map(points.map((point) => [point.join(','), point]));
  return [...unique.values()].slice(0, 12);
}

const cmsUrl = localUrl(
  process.env.NEXT_PUBLIC_STRAPI_URL,
  'NEXT_PUBLIC_STRAPI_URL',
  'http://localhost:1337'
);
const frontendUrl = localUrl(
  process.env.LOCAL_FRONTEND_URL,
  'LOCAL_FRONTEND_URL',
  'http://localhost:3000'
);
const apiToken = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;
const headers = {
  Accept: 'application/json',
  ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
};

const chapterResponse = await requiredResponse(queryUrl(cmsUrl), { headers });
const chapterPayload = await chapterResponse.json();
assert.ok(Array.isArray(chapterPayload.data), 'Strapi doit retourner une collection de chapitres.');
assert.equal(chapterPayload.data.length, EXPECTED_CHAPTERS, `Le corpus doit contenir ${EXPECTED_CHAPTERS} chapitres publiés.`);

const indexResponse = await requiredResponse(
  new URL('/api/chapters/proximity-index', frontendUrl),
  { headers: { Accept: 'application/json' } }
);
const index = await indexResponse.json();
assert.equal(index.schemaVersion, 1, 'La recette attend le schéma d’index 1.');
assert.equal(index.partial, false, 'Les 20 traces du corpus doivent produire un index complet.');
assert.equal(index.chapters.length, EXPECTED_CHAPTERS, 'Chaque chapitre doit être présent dans l’index.');

const rawChapters = [];
let rawTraceCount = 0;
let rawPointCount = 0;

for (const chapter of chapterPayload.data) {
  const traces = [];

  for (const direction of ['AB', 'BA']) {
    const media = chapter[`gpxFile${direction}`];
    assert.ok(media?.url, `${chapter.slug} doit posséder sa trace ${direction}.`);
    const mediaUrl = assertTrustedMediaUrl(media.url, cmsUrl.origin);
    const mediaResponse = await requiredResponse(mediaUrl, {
      headers: { Accept: 'application/gpx+xml, application/xml, text/xml, */*' },
    });
    const segments = parseGpxSegments(await mediaResponse.text());
    const boundingBox = computeGeometryBoundingBox(segments);
    assert.ok(boundingBox, `${chapter.slug} ${direction} doit contenir une géométrie exploitable.`);
    rawPointCount += segments.reduce((total, segment) => total + segment.length, 0);
    rawTraceCount += 1;
    traces.push({ direction, segments, boundingBox });
  }

  rawChapters.push({
    documentId: chapter.documentId,
    slug: chapter.slug,
    displayOrder: chapter.displayOrder,
    boundingBox: traces[0].boundingBox,
    traces,
  });
}

assert.equal(rawTraceCount, EXPECTED_TRACES, `La recette doit comparer ${EXPECTED_TRACES} traces brutes.`);

const indexByDocumentId = new Map(index.chapters.map((chapter) => [chapter.documentId, chapter]));
let comparisonPoints = 0;
let maximumDistanceErrorMeters = 0;

for (const rawChapter of rawChapters) {
  const simplifiedChapter = indexByDocumentId.get(rawChapter.documentId);
  assert.ok(simplifiedChapter, `${rawChapter.slug} doit exister dans l’index simplifié.`);

  for (const rawTrace of rawChapter.traces) {
    const simplifiedTrace = simplifiedChapter.traces.find(({ direction }) => direction === rawTrace.direction);
    assert.ok(simplifiedTrace, `${rawChapter.slug} ${rawTrace.direction} doit exister dans l’index simplifié.`);
    const rawTraceChapter = traceChapter(rawChapter, rawTrace);
    const simplifiedTraceChapter = traceChapter(simplifiedChapter, simplifiedTrace);

    for (const point of sampledPoints(rawTrace.segments)) {
      for (const candidate of [point, [point[0], point[1] + 0.00045]]) {
        const rawDistance = distanceToChapterMeters(candidate, rawTraceChapter);
        const simplifiedDistance = distanceToChapterMeters(candidate, simplifiedTraceChapter);
        assert.notEqual(rawDistance, null);
        assert.notEqual(simplifiedDistance, null);
        const errorMeters = Math.abs(rawDistance - simplifiedDistance);
        maximumDistanceErrorMeters = Math.max(maximumDistanceErrorMeters, errorMeters);
        comparisonPoints += 1;
      }
    }
  }
}

assert.ok(
  maximumDistanceErrorMeters <= MAX_DISTANCE_ERROR_METERS,
  `L’erreur maximale brut/simplifié (${maximumDistanceErrorMeters.toFixed(2)} m) dépasse ${MAX_DISTANCE_ERROR_METERS} m.`
);

let decisiveWinnerChecks = 0;
let ambiguousChecks = 0;

for (const rawChapter of rawChapters) {
  for (const point of representativePoints(rawChapter)) {
    const rawRanking = rankChapterDistances(point, rawChapters);
    const simplifiedRanking = rankChapterDistances(point, index.chapters);
    assert.ok(rawRanking.length >= 2 && simplifiedRanking.length >= 2);

    const rawMargin = rawRanking[1].distanceMeters - rawRanking[0].distanceMeters;
    if (rawMargin > WINNER_MARGIN_METERS) {
      decisiveWinnerChecks += 1;
      assert.equal(
        simplifiedRanking[0].documentId,
        rawRanking[0].documentId,
        'Le chapitre gagnant doit rester identique lorsque la marge brute dépasse 50 m.'
      );
      continue;
    }

    ambiguousChecks += 1;
    const candidates = new Set(
      classifyChapterProximity(point, 20, index.chapters).results.map(({ documentId }) => documentId)
    );
    assert.ok(
      candidates.has(rawRanking[0].documentId) && candidates.has(rawRanking[1].documentId),
      'Deux chapitres séparés de 50 m ou moins dans le brut doivent rester proposés comme candidats.'
    );
  }
}

assert.ok(decisiveWinnerChecks > 0, 'Le corpus doit contenir des cas au gagnant décisif.');
assert.ok(ambiguousChecks > 0, 'Le corpus doit contenir au moins un cas ambigu ou de jonction.');

const simplifiedPointCount = index.chapters.reduce(
  (chapterTotal, chapter) => chapterTotal + chapter.traces.reduce(
    (traceTotal, trace) => traceTotal + trace.segments.reduce(
      (segmentTotal, segment) => segmentTotal + segment.length,
      0
    ),
    0
  ),
  0
);

console.log(JSON.stringify({
  corpus: {
    chapters: rawChapters.length,
    traces: rawTraceCount,
    rawPoints: rawPointCount,
    simplifiedPoints: simplifiedPointCount,
  },
  distanceEquivalence: {
    comparisonPoints,
    maximumDistanceErrorMeters: Number(maximumDistanceErrorMeters.toFixed(2)),
    limitMeters: MAX_DISTANCE_ERROR_METERS,
  },
  rankingEquivalence: {
    decisiveWinnerChecks,
    ambiguousChecks,
    decisiveMarginMeters: WINNER_MARGIN_METERS,
  },
}, null, 2));
