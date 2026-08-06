import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGpxBuilderManifest,
  toPublicGpxBuilderManifest,
} from '../lib/gpx-builder/manifest.ts';

function anchor(sourceSha256: string, chainageMetres: number) {
  return {
    status: 'validated' as const,
    sourceSha256,
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex: Math.abs(chainageMetres),
    fraction: 0,
    chainageMetres,
    projectedLatitude: 50,
    projectedLongitude: 2 + chainageMetres / 100,
    distanceToCityMetres: 10,
    algorithmVersion: 'gpx-anchor-v1',
  };
}

test('buildGpxBuilderManifest orders AB and BA stops without exposing source data', () => {
  const hashes = {
    oneAB: 'a'.repeat(64),
    oneBA: 'b'.repeat(64),
    twoAB: 'c'.repeat(64),
    twoBA: 'd'.repeat(64),
  };
  const chapters = [
    {
      documentId: 'chapter-one',
      title: 'Lille → Arras',
      slug: 'lille-a-arras',
      displayOrder: 1,
      startStation: 'Lille',
      endStation: 'Arras',
      gpxFileAB: { url: '/one-ab.gpx', documentId: 'media-one-ab', updatedAt: '2026-08-06' },
      gpxFileBA: { url: '/one-ba.gpx', documentId: 'media-one-ba', updatedAt: '2026-08-06' },
      cityPassages: [
        {
          id: 1,
          city: { documentId: 'city-a', name: 'Lille', alternativeNames: ['Rijsel'], publishedAt: '2026-08-06' },
          gpxAnchorAB: anchor(hashes.oneAB, 0),
          gpxAnchorBA: anchor(hashes.oneBA, 10),
        },
        {
          id: 2,
          city: { documentId: 'city-b', name: 'Arras', publishedAt: '2026-08-06' },
          gpxAnchorAB: anchor(hashes.oneAB, 10),
          gpxAnchorBA: anchor(hashes.oneBA, 0),
        },
      ],
      gpxJunctionAfterAB: { status: 'exact', sourceSha256: hashes.oneAB, nextSourceSha256: hashes.twoAB, gapMetres: 0 },
      gpxJunctionAfterBA: { status: 'exact', sourceSha256: hashes.oneBA, nextSourceSha256: hashes.twoBA, gapMetres: 0 },
    },
    {
      documentId: 'chapter-two',
      title: 'Arras → Amiens',
      slug: 'arras-a-amiens',
      displayOrder: 2,
      startStation: 'Arras',
      endStation: 'Amiens',
      gpxFileAB: { url: '/two-ab.gpx', documentId: 'media-two-ab', updatedAt: '2026-08-06' },
      gpxFileBA: { url: '/two-ba.gpx', documentId: 'media-two-ba', updatedAt: '2026-08-06' },
      cityPassages: [
        {
          id: 3,
          city: { documentId: 'city-b', name: 'Arras', publishedAt: '2026-08-06' },
          gpxAnchorAB: anchor(hashes.twoAB, 0),
          gpxAnchorBA: anchor(hashes.twoBA, 10),
        },
        {
          id: 4,
          city: { documentId: 'city-c', name: 'Amiens', publishedAt: '2026-08-06' },
          gpxAnchorAB: anchor(hashes.twoAB, 10),
          gpxAnchorBA: anchor(hashes.twoBA, 0),
        },
      ],
      gpxJunctionAfterAB: { status: 'exact', sourceSha256: hashes.twoAB, nextSourceSha256: hashes.oneAB, gapMetres: 0 },
      gpxJunctionAfterBA: { status: 'exact', sourceSha256: hashes.twoBA, nextSourceSha256: hashes.oneBA, gapMetres: 0 },
    },
  ];

  const manifest = buildGpxBuilderManifest(true, chapters);
  const publicManifest = toPublicGpxBuilderManifest(manifest);

  assert.deepEqual(
    publicManifest.directions.AB.stops.map((stop) => stop.name),
    ['Lille', 'Arras', 'Amiens']
  );
  assert.deepEqual(
    publicManifest.directions.BA.stops.map((stop) => stop.name),
    ['Amiens', 'Arras', 'Lille']
  );
  assert.equal(publicManifest.directions.AB.label, 'Sens Lille → Arras');
  assert.equal(publicManifest.directions.BA.label, 'Sens Amiens → Arras');
  assert.match(publicManifest.directions.AB.stops[0].id, /^stop_[a-f0-9]{16}$/);

  const serialized = JSON.stringify(publicManifest);
  assert.doesNotMatch(serialized, /one-ab\.gpx|projectedLatitude|sourceSha256|media-one-ab/);
});

test('buildGpxBuilderManifest keeps repeated non-boundary city occurrences distinct', () => {
  const hashAB = 'a'.repeat(64);
  const hashBA = 'b'.repeat(64);
  const manifest = buildGpxBuilderManifest(true, [{
    documentId: 'chapter-loop',
    title: 'Boucle locale',
    slug: 'boucle-locale',
    displayOrder: 1,
    startStation: 'Lille',
    endStation: 'Lille',
    gpxFileAB: { url: '/loop-ab.gpx' },
    gpxFileBA: { url: '/loop-ba.gpx' },
    cityPassages: [
      {
        id: 10,
        city: { documentId: 'city-lille', name: 'Lille', publishedAt: '2026-08-06' },
        gpxAnchorAB: anchor(hashAB, 0),
        gpxAnchorBA: anchor(hashBA, 10),
      },
      {
        id: 11,
        city: { documentId: 'city-roubaix', name: 'Roubaix', publishedAt: '2026-08-06' },
        gpxAnchorAB: anchor(hashAB, 5),
        gpxAnchorBA: anchor(hashBA, 5),
      },
      {
        id: 12,
        city: { documentId: 'city-lille', name: 'Lille', publishedAt: '2026-08-06' },
        gpxAnchorAB: anchor(hashAB, 10),
        gpxAnchorBA: anchor(hashBA, 0),
      },
    ],
    gpxJunctionAfterAB: {
      status: 'exact', sourceSha256: hashAB, nextSourceSha256: hashAB, gapMetres: 0,
    },
    gpxJunctionAfterBA: {
      status: 'exact', sourceSha256: hashBA, nextSourceSha256: hashBA, gapMetres: 0,
    },
  }]);
  const publicManifest = toPublicGpxBuilderManifest(manifest);
  const lilleStops = publicManifest.directions.AB.stops.filter((stop) => stop.name === 'Lille');

  assert.equal(lilleStops.length, 2);
  assert.notEqual(lilleStops[0].id, lilleStops[1].id);
  assert.ok(lilleStops.every((stop) => stop.context));
});
