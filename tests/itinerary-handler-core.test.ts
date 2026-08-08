import assert from 'node:assert/strict';
import test from 'node:test';

import { handleItineraryArtifactGetCore } from '../lib/itineraries/handler-core.ts';
import {
  ItineraryArtifactIntegrityError,
  ItineraryArtifactUpstreamError,
} from '../lib/itineraries/media-core.ts';
import { CatalogueUnavailableError } from '../lib/itineraries/server-core.ts';
import { sha256, verifiedItineraryFixture } from './itinerary-fixtures.ts';

test('the artifact handler sets bounded public cache, ETag and GPX download headers', async () => {
  const { guarded, gpxBytes } = verifiedItineraryFixture();
  const digest = sha256(gpxBytes);
  const response = await handleItineraryArtifactGetCore(
    guarded.dto.slug,
    'gpx',
    new Request(`https://gthf.test${guarded.dto.downloadPath}`),
    {
      preview: false,
      getItinerary: async () => guarded,
      loadArtifact: async () => ({
        bytes: gpxBytes,
        contentType: 'application/gpx+xml',
        filename: 'calais-boulogne-sur-mer-gthf.gpx',
        sha256: digest,
      }),
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, s-maxage=60, must-revalidate');
  assert.equal(response.headers.get('etag'), `"${digest}"`);
  assert.equal(response.headers.get('content-type'), 'application/gpx+xml');
  assert.match(response.headers.get('content-disposition') ?? '', /^attachment;/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), gpxBytes);
});

test('If-None-Match returns a bodyless 304 while retaining validation headers', async () => {
  const { guarded, geometryBytes } = verifiedItineraryFixture();
  const digest = sha256(geometryBytes);
  const response = await handleItineraryArtifactGetCore(
    guarded.dto.slug,
    'geometry',
    new Request(`https://gthf.test${guarded.dto.geometryPath}`, {
      headers: { 'If-None-Match': `"another", W/"${digest}"` },
    }),
    {
      preview: false,
      getItinerary: async () => guarded,
      loadArtifact: async () => ({
        bytes: geometryBytes,
        contentType: 'application/json',
        filename: 'calais-boulogne-sur-mer-gthf.json',
        sha256: digest,
      }),
    }
  );

  assert.equal(response.status, 304);
  assert.equal(response.headers.get('etag'), `"${digest}"`);
  assert.equal(response.headers.get('content-length'), null);
  assert.equal(await response.text(), '');
});

test('preview artifacts are private and carry an anti-indexing header', async () => {
  const { guarded, geometryBytes } = verifiedItineraryFixture();
  const response = await handleItineraryArtifactGetCore(
    guarded.dto.slug,
    'geometry',
    undefined,
    {
      preview: true,
      getItinerary: async () => guarded,
      loadArtifact: async () => ({
        bytes: geometryBytes,
        contentType: 'application/json',
        filename: 'calais-boulogne-sur-mer-gthf.json',
        sha256: sha256(geometryBytes),
      }),
    }
  );
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('content-disposition'), null);
});

test('closed entries map to 404 while upstream failures map to uncached 503', async () => {
  const { guarded } = verifiedItineraryFixture();
  const notFound = await handleItineraryArtifactGetCore('closed', 'gpx', undefined, {
    preview: false,
    getItinerary: async () => null,
    loadArtifact: async () => { throw new Error('unreachable'); },
  });
  assert.equal(notFound.status, 404);
  assert.equal(notFound.headers.get('cache-control'), 'public, max-age=0, s-maxage=60, must-revalidate');

  for (const failure of [
    new CatalogueUnavailableError('strapi_500'),
    new ItineraryArtifactUpstreamError('media_fetch_failed'),
  ]) {
    const unavailable = await handleItineraryArtifactGetCore('temporary', 'gpx', undefined, {
      preview: false,
      getItinerary: async () => {
        if (failure instanceof CatalogueUnavailableError) throw failure;
        return guarded;
      },
      loadArtifact: async () => { throw failure; },
    });
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get('cache-control'), 'private, no-store');
  }
});

test('integrity failures are hidden behind a non-cacheable 404', async () => {
  const { guarded } = verifiedItineraryFixture();
  const reports: string[] = [];
  const response = await handleItineraryArtifactGetCore('invalid', 'gpx', undefined, {
    preview: false,
    getItinerary: async () => guarded,
    loadArtifact: async () => {
      throw new ItineraryArtifactIntegrityError('media_hash_mismatch');
    },
    reportError: (message) => reports.push(message),
  });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(reports[0], /media_hash_mismatch/);
});
