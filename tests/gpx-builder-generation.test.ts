import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateGpxSelection,
  GpxBuilderError,
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

test('generateGpxSelection uses each direction official geometry and elevation', async () => {
  const manifest = fixture();
  const loadedUrls: string[] = [];
  const loadSource = async (media: { url: string }) => {
    loadedUrls.push(media.url);
    return media.url.includes('-ab.')
      ? gpx([0, 10, 20])
      : gpx([0, 40, 80]);
  };

  const ab = await generateGpxSelection({
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
  const ba = await generateGpxSelection({
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
        direction: 'AB',
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
        direction: 'AB',
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
    direction: 'AB' as const,
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
  const generated = await generateGpxSelection({
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
