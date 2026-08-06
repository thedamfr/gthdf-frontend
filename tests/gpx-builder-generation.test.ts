import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateDirectionalGpxSelection,
  generateGpxSelection,
  GpxBuilderError,
  inferGpxDirection,
} from '../lib/gpx-builder/generate.ts';
import { buildGpxBuilderManifest } from '../lib/gpx-builder/manifest.ts';
import { GpxSourceError } from '../lib/gpx-builder/source-loader-core.ts';
import { distanceWgs84Metres } from '../lib/gpx/geometry.ts';
import { parseOfficialGpx } from '../lib/gpx/parser.ts';

const HASH_AB = 'a'.repeat(64);
const HASH_BA = 'b'.repeat(64);

function anchor(
  sourceSha256: string,
  pointIndex: number,
  chainageMetres: number,
  longitude: number
) {
  return {
    status: 'validated' as const,
    sourceSha256,
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex,
    fraction: 0,
    chainageMetres,
    projectedLatitude: 50,
    projectedLongitude: longitude,
    distanceToCityMetres: 0,
    algorithmVersion: 'gpx-anchor-v1',
  };
}

function gpx(elevations: [number, number, number]) {
  return parseOfficialGpx(`<?xml version="1.0"?>
    <gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
      <trk><trkseg>
        <trkpt lat="50" lon="2"><ele>${elevations[0]}</ele></trkpt>
        <trkpt lat="50" lon="2.001"><ele>${elevations[1]}</ele></trkpt>
        <trkpt lat="50" lon="2.002"><ele>${elevations[2]}</ele></trkpt>
      </trkseg></trk>
    </gpx>`);
}

function fixture() {
  const chapter = {
    documentId: 'chapter-one',
    title: 'Lille → Arras',
    slug: 'lille-a-arras',
    displayOrder: 1,
    startStation: 'Lille',
    endStation: 'Arras',
    gpxFileAB: { url: '/official-ab.gpx' },
    gpxFileBA: { url: '/official-ba.gpx' },
    cityPassages: [
      {
        id: 1,
        city: { documentId: 'city-lille', name: 'Lille', publishedAt: '2026-08-06' },
        gpxAnchorAB: anchor(HASH_AB, 0, 0, 2),
        gpxAnchorBA: anchor(HASH_BA, 2, 144, 2.002),
      },
      {
        id: 2,
        city: { documentId: 'city-arras', name: 'Arras', publishedAt: '2026-08-06' },
        gpxAnchorAB: anchor(HASH_AB, 2, 144, 2.002),
        gpxAnchorBA: anchor(HASH_BA, 0, 0, 2),
      },
    ],
    gpxJunctionAfterAB: {
      status: 'exact' as const,
      sourceSha256: HASH_AB,
      nextSourceSha256: HASH_AB,
      gapMetres: 0,
    },
    gpxJunctionAfterBA: {
      status: 'exact' as const,
      sourceSha256: HASH_BA,
      nextSourceSha256: HASH_BA,
      gapMetres: 0,
    },
  };
  return buildGpxBuilderManifest(true, [chapter]);
}

function directionInferenceFixture() {
  const stop = (id: string, name: string, chapterIndex: number, chainageMetres: number) => ({
    id,
    cityDocumentId: `city-${name.toLowerCase()}`,
    name,
    alternativeNames: [],
    context: null,
    members: [{
      chapterIndex,
      passageId: id.charCodeAt(id.length - 1),
      anchor: anchor(HASH_AB, 0, chainageMetres, 2),
    }],
  });
  const chapter = (slug: string) => ({
    documentId: slug,
    slug,
    title: slug,
    media: { url: `/${slug}.gpx` },
    sourceSha256: HASH_AB,
    distanceMetres: 100,
    junctionAfter: {
      status: 'exact' as const,
      sourceSha256: HASH_AB,
      nextSourceSha256: HASH_AB,
      gapMetres: 0,
    },
  });
  const idA = `stop_${'1'.repeat(16)}`;
  const idB = `stop_${'2'.repeat(16)}`;
  const idC = `stop_${'3'.repeat(16)}`;
  return {
    enabled: true,
    revision: 'f'.repeat(24),
    directions: {
      AB: {
        label: 'Sens A → B',
        chapters: [chapter('one-ab'), chapter('two-ab')],
        stops: [stop(idA, 'A', 0, 0), stop(idB, 'B', 0, 30), stop(idC, 'C', 1, 100)],
      },
      BA: {
        label: 'Sens C → B',
        chapters: [chapter('two-ba'), chapter('one-ba')],
        stops: [stop(idC, 'C', 0, 0), stop(idB, 'B', 1, 0), stop(idA, 'A', 1, 70)],
      },
    },
  };
}

test('inferGpxDirection chooses the shortest official portion from the two cities', () => {
  const manifest = directionInferenceFixture();
  const [a, b] = manifest.directions.AB.stops;

  assert.equal(inferGpxDirection(manifest, a.id, b.id), 'AB');
  assert.equal(inferGpxDirection(manifest, b.id, a.id), 'BA');

  manifest.directions.BA.chapters[0].distanceMetres = 0;
  assert.equal(inferGpxDirection(manifest, a.id, b.id), 'AB');
});

test('generateGpxSelection loads only the automatically inferred direction', async () => {
  const manifest = directionInferenceFixture();
  const [a, b] = manifest.directions.AB.stops;
  const loadedUrls: string[] = [];

  await assert.rejects(
    generateGpxSelection({
      manifest,
      selection: {
        departureId: a.id,
        arrivalId: b.id,
        revision: manifest.revision,
      },
      generatedAt: new Date(),
      loadSource: async (media) => {
        loadedUrls.push(media.url);
        throw new GpxSourceError('source_unavailable', 'Source volontairement arrêtée.');
      },
    }),
    /volontairement arrêtée/
  );
  assert.deepEqual(loadedUrls, ['/one-ab.gpx']);
});

test('generateGpxSelection uses each direction official geometry and elevation', async () => {
  const manifest = fixture();
  const loadedUrls: string[] = [];
  const loadSource = async (media: { url: string }) => {
    loadedUrls.push(media.url);
    return media.url.includes('-ab.')
      ? gpx([0, 10, 20])
      : gpx([0, 40, 80]);
  };

  const ab = await generateDirectionalGpxSelection({
    manifest,
    selection: {
      direction: 'AB',
      departureId: manifest.directions.AB.stops[0].id,
      arrivalId: manifest.directions.AB.stops[1].id,
      revision: manifest.revision,
    },
    generatedAt: new Date('2026-08-06T10:00:00Z'),
    loadSource,
  });
  const ba = await generateDirectionalGpxSelection({
    manifest,
    selection: {
      direction: 'BA',
      departureId: manifest.directions.BA.stops[0].id,
      arrivalId: manifest.directions.BA.stops[1].id,
      revision: manifest.revision,
    },
    generatedAt: new Date('2026-08-06T10:00:00Z'),
    loadSource,
  });

  assert.deepEqual(loadedUrls, ['/official-ab.gpx', '/official-ba.gpx']);
  assert.equal(ab.summary.departureName, 'Lille');
  assert.equal(ba.summary.departureName, 'Arras');
  assert.ok((ab.summary.elevationGainMetres ?? 0) < (ba.summary.elevationGainMetres ?? 0));
  assert.match(ab.gpx, /sens AB/);
  assert.match(ba.gpx, /sens BA/);
  assert.equal(ab.filename, 'gthf-lille-vers-arras-ab.gpx');
});

test('generateGpxSelection rejects stale, identical and unknown selections', async () => {
  const manifest = fixture();
  const stopId = manifest.directions.AB.stops[0].id;
  const loadSource = async () => gpx([0, 10, 20]);

  await assert.rejects(
    generateGpxSelection({
      manifest,
      selection: {
        departureId: stopId,
        arrivalId: stopId,
        revision: manifest.revision,
      },
      generatedAt: new Date(),
      loadSource,
    }),
    /différentes/
  );
  await assert.rejects(
    generateGpxSelection({
      manifest,
      selection: {
        departureId: stopId,
        arrivalId: 'stop_unknown',
        revision: 'stale',
      },
      generatedAt: new Date(),
      loadSource,
    }),
    /actualisée/
  );
});

test('generateGpxSelection exposes only typed source failures', async () => {
  const manifest = fixture();
  const selection = {
    departureId: manifest.directions.AB.stops[0].id,
    arrivalId: manifest.directions.AB.stops[1].id,
    revision: manifest.revision,
  };

  await assert.rejects(
    generateGpxSelection({
      manifest,
      selection,
      generatedAt: new Date(),
      loadSource: async () => {
        throw new GpxSourceError(
          'source_stale',
          'La trace officielle a été actualisée et doit être requalifiée.'
        );
      },
    }),
    (error) => error instanceof GpxBuilderError
      && error.code === 'source_stale'
      && /requalifiée/.test(error.message)
  );

  const internalError = new Error('sensitive internal detail');
  await assert.rejects(
    generateGpxSelection({
      manifest,
      selection,
      generatedAt: new Date(),
      loadSource: async () => {
        throw internalError;
      },
    }),
    (error) => error === internalError
  );
});

test('generateGpxSelection crosses the loop origin without loading one source twice', async () => {
  const manifest = fixture();
  manifest.directions.AB.chapters[0].junctionAfter = {
    status: 'accepted_gap',
    sourceSha256: HASH_AB,
    nextSourceSha256: HASH_AB,
    gapMetres: distanceWgs84Metres(
      { latitude: 50, longitude: 2.002 },
      { latitude: 50, longitude: 2 }
    ),
    reviewNote: 'Rupture synthétique relue pour le test.',
  };
  let loadCount = 0;
  const generated = await generateDirectionalGpxSelection({
    manifest,
    selection: {
      direction: 'AB',
      departureId: manifest.directions.AB.stops[1].id,
      arrivalId: manifest.directions.AB.stops[0].id,
      revision: manifest.revision,
    },
    generatedAt: new Date('2026-08-06T10:00:00Z'),
    loadSource: async () => {
      loadCount += 1;
      return gpx([0, 10, 20]);
    },
  });

  assert.equal(loadCount, 1);
  assert.equal(generated.summary.usesLoopOrigin, true);
  assert.equal(generated.summary.sequenceCount, 2);
  assert.equal(generated.summary.warnings.length, 1);
});
