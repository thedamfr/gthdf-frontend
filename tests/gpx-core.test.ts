import assert from 'node:assert/strict';
import test from 'node:test';

import { materializeAnchorPoint } from '../lib/gpx/anchor.ts';
import { extractBetweenAnchors } from '../lib/gpx/extract.ts';
import { distanceWgs84Metres } from '../lib/gpx/geometry.ts';
import { sha256Hex } from '../lib/gpx/hash.ts';
import { computeRouteMetrics } from '../lib/gpx/metrics.ts';
import { parseOfficialGpx } from '../lib/gpx/parser.ts';
import { extractRoutePortion } from '../lib/gpx/route.ts';
import { safeGpxFilename, serializeGpxPortion } from '../lib/gpx/serialize.ts';
import type { GpxAnchor } from '../lib/gpx/types.ts';

test('parseOfficialGpx preserves track and segment indexes with elevation', () => {
  const document = parseOfficialGpx(`<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
      <trk><trkseg>
        <trkpt lat="50" lon="2"><ele>12.5</ele><time>2026-01-01T00:00:00Z</time></trkpt>
        <trkpt lat="50.1" lon="2.1"><ele>18</ele></trkpt>
      </trkseg><trkseg>
        <trkpt lat="50.2" lon="2.2"><ele>22</ele></trkpt>
      </trkseg></trk>
    </gpx>`);

  assert.deepEqual(document.tracks, [{
    trackIndex: 0,
    segments: [
      {
        trackIndex: 0,
        segmentIndex: 0,
        points: [
          { latitude: 50, longitude: 2, elevation: 12.5 },
          { latitude: 50.1, longitude: 2.1, elevation: 18 },
        ],
      },
      {
        trackIndex: 0,
        segmentIndex: 1,
        points: [{ latitude: 50.2, longitude: 2.2, elevation: 22 }],
      },
    ],
  }]);
  assert.equal(document.pointCount, 3);
});

test('distanceWgs84Metres uses the WGS84 ellipsoid', () => {
  const distance = distanceWgs84Metres(
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 }
  );

  assert.ok(Math.abs(distance - 111_319.4908) < 0.01);
});

test('materializeAnchorPoint interpolates coordinates and elevation', () => {
  const document = parseOfficialGpx(`<gpx version="1.1"><trk><trkseg>
    <trkpt lat="50" lon="2"><ele>100</ele></trkpt>
    <trkpt lat="51" lon="4"><ele>200</ele></trkpt>
  </trkseg></trk></gpx>`);
  const point = materializeAnchorPoint(document, {
    status: 'validated',
    sourceSha256: 'a'.repeat(64),
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex: 0,
    fraction: 0.25,
    chainageMetres: 1,
    projectedLatitude: 50.25,
    projectedLongitude: 2.5,
    distanceToCityMetres: 20,
    algorithmVersion: 'gpx-anchor-v1',
  });

  assert.deepEqual(point, {
    latitude: 50.25,
    longitude: 2.5,
    elevation: 125,
  });
});

test('extractBetweenAnchors keeps only the source points between two interpolated cuts', () => {
  const document = parseOfficialGpx(`<gpx version="1.1"><trk><trkseg>
    <trkpt lat="50" lon="2"><ele>0</ele></trkpt>
    <trkpt lat="50" lon="3"><ele>10</ele></trkpt>
    <trkpt lat="50" lon="4"><ele>20</ele></trkpt>
    <trkpt lat="50" lon="5"><ele>30</ele></trkpt>
  </trkseg></trk></gpx>`);
  const anchor = (
    pointIndex: number,
    fraction: number,
    longitude: number
  ): GpxAnchor => ({
    status: 'validated',
    sourceSha256: 'a'.repeat(64),
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex,
    fraction,
    chainageMetres: longitude,
    projectedLatitude: 50,
    projectedLongitude: longitude,
    distanceToCityMetres: 1,
    algorithmVersion: 'gpx-anchor-v1',
  });

  const sequences = extractBetweenAnchors(
    document,
    anchor(0, 0.5, 2.5),
    anchor(2, 0.5, 4.5)
  );

  assert.deepEqual(sequences, [[
    { latitude: 50, longitude: 2.5, elevation: 5 },
    { latitude: 50, longitude: 3, elevation: 10 },
    { latitude: 50, longitude: 4, elevation: 20 },
    { latitude: 50, longitude: 4.5, elevation: 25 },
  ]]);
});

test('extractRoutePortion joins exact boundaries across several chapters', () => {
  const source = (start: number, end: number) => parseOfficialGpx(
    `<gpx version="1.1"><trk><trkseg>
      <trkpt lat="0" lon="${start}"><ele>${start}</ele></trkpt>
      <trkpt lat="0" lon="${end}"><ele>${end}</ele></trkpt>
    </trkseg></trk></gpx>`
  );
  const hashes = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)];
  const chapters = [
    { slug: 'one', sourceSha256: hashes[0], document: source(0, 1) },
    { slug: 'two', sourceSha256: hashes[1], document: source(1, 2) },
    { slug: 'three', sourceSha256: hashes[2], document: source(2, 3) },
  ].map((chapter, index, all) => ({
    ...chapter,
    junctionAfter: {
      status: 'exact' as const,
      sourceSha256: chapter.sourceSha256,
      nextSourceSha256: all[(index + 1) % all.length].sourceSha256,
      gapMetres: 0,
    },
  }));
  const anchor = (chapterIndex: number, fraction: number): GpxAnchor => ({
    status: 'validated',
    sourceSha256: hashes[chapterIndex],
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex: 0,
    fraction,
    chainageMetres: fraction,
    projectedLatitude: 0,
    projectedLongitude: chapterIndex + fraction,
    distanceToCityMetres: 1,
    algorithmVersion: 'gpx-anchor-v1',
  });

  const portion = extractRoutePortion(
    chapters,
    { chapterIndex: 0, anchor: anchor(0, 0.5) },
    { chapterIndex: 2, anchor: anchor(2, 0.5) }
  );

  assert.equal(portion.usesLoopOrigin, false);
  assert.deepEqual(portion.chapterSlugs, ['one', 'two', 'three']);
  assert.deepEqual(
    portion.sequences.map((sequence) => sequence.map((point) => point.longitude)),
    [[0.5, 1, 2, 2.5]]
  );
});

test('computeRouteMetrics never measures across a sequence break', () => {
  const point = (longitude: number) => ({
    latitude: 0,
    longitude,
    elevation: longitude * 10,
  });
  const metrics = computeRouteMetrics([
    [point(0), point(1)],
    [point(2), point(3)],
  ]);

  assert.ok(Math.abs(metrics.distanceMetres - 2 * 111_319.4908) < 0.02);
});

test('computeRouteMetrics exposes smoothed gain only with sufficient elevation coverage', () => {
  const complete = computeRouteMetrics([[
    { latitude: 50, longitude: 2, elevation: 0 },
    { latitude: 50, longitude: 2.005, elevation: 50 },
    { latitude: 50, longitude: 2.01, elevation: 100 },
  ]]);

  assert.equal(complete.elevationAvailable, true);
  assert.ok((complete.elevationGainMetres ?? 0) > 90);
  assert.ok((complete.elevationGainMetres ?? 0) <= 100);
  assert.equal(complete.elevationLossMetres, 0);

  const incomplete = computeRouteMetrics([[
    { latitude: 50, longitude: 2, elevation: 0 },
    { latitude: 50, longitude: 2.01 },
    { latitude: 50, longitude: 2.02, elevation: 100 },
  ]]);
  assert.equal(incomplete.elevationAvailable, false);
  assert.equal(incomplete.elevationGainMetres, null);
});

test('computeRouteMetrics interpolates a short internal elevation gap', () => {
  const completePoints = Array.from({ length: 51 }, (_, index) => ({
    latitude: 50,
    longitude: 2 + index * 0.0001,
    elevation: index,
  }));
  const shortGapPoints = completePoints.map((point, index) => (
    index === 25
      ? { latitude: point.latitude, longitude: point.longitude }
      : point
  ));
  const complete = computeRouteMetrics([completePoints]);
  const shortGap = computeRouteMetrics([shortGapPoints]);

  assert.equal(shortGap.elevationAvailable, true);
  assert.ok(
    Math.abs(
      (shortGap.elevationGainMetres ?? 0) - (complete.elevationGainMetres ?? 0)
    ) < 0.05
  );
});

test('serializeGpxPortion creates a self-contained GPX without trackpoint times', () => {
  const xml = serializeGpxPortion({
    departureName: 'Boulogne-sur-Mer',
    arrivalName: 'Gravelines & environs',
    direction: 'AB',
    generatedAt: new Date('2026-08-06T10:00:00.000Z'),
    sequences: [
      [{ latitude: 50, longitude: 2, elevation: 12 }],
      [{ latitude: 51, longitude: 3, elevation: 24 }],
    ],
  });

  assert.match(xml, /creator="GTHF GPX Builder"/);
  assert.match(xml, /Gravelines &amp; environs/);
  assert.equal((xml.match(/<trkseg>/g) ?? []).length, 2);
  assert.equal((xml.match(/<time>/g) ?? []).length, 1);
  assert.equal(parseOfficialGpx(xml).pointCount, 2);
  assert.equal(
    safeGpxFilename('Boulogne-sur-Mer', 'Gravelines & environs', 'AB'),
    'gthf-boulogne-sur-mer-vers-gravelines-et-environs-ab.gpx'
  );
});

test('parseOfficialGpx rejects unsafe, unsupported and oversized sources', () => {
  assert.throws(
    () => parseOfficialGpx('<!DOCTYPE gpx><gpx version="1.1"><trk><trkseg><trkpt lat="0" lon="0" /></trkseg></trk></gpx>'),
    /DOCTYPE and ENTITY/
  );
  assert.throws(
    () => parseOfficialGpx('<gpx version="1.1"><wpt lat="0" lon="0" /><trk><trkseg><trkpt lat="0" lon="0" /></trkseg></trk></gpx>'),
    /Waypoints, routes and extensions/
  );
  assert.throws(
    () => parseOfficialGpx(
      '<gpx version="1.1"><trk><trkseg><trkpt lat="0" lon="0" /><trkpt lat="0" lon="1" /></trkseg></trk></gpx>',
      { maximumPoints: 1 }
    ),
    /exceeds its geometry limits/
  );
});

test('extractRoutePortion wraps once through the loop origin', () => {
  const source = (start: number, end: number) => parseOfficialGpx(
    `<gpx version="1.1"><trk><trkseg><trkpt lat="0" lon="${start}" /><trkpt lat="0" lon="${end}" /></trkseg></trk></gpx>`
  );
  const hashes = ['d'.repeat(64), 'e'.repeat(64), 'f'.repeat(64)];
  const documents = [source(0, 1), source(1, 2), source(2, 0)];
  const chapters = documents.map((document, index) => ({
    slug: `chapter-${index}`,
    sourceSha256: hashes[index],
    document,
    junctionAfter: {
      status: 'exact' as const,
      sourceSha256: hashes[index],
      nextSourceSha256: hashes[(index + 1) % hashes.length],
      gapMetres: 0,
    },
  }));
  const anchor = (
    chapterIndex: number,
    longitude: number,
    chainageMetres: number
  ): GpxAnchor => ({
    status: 'validated',
    sourceSha256: hashes[chapterIndex],
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex: 0,
    fraction: 0.5,
    chainageMetres,
    projectedLatitude: 0,
    projectedLongitude: longitude,
    distanceToCityMetres: 1,
    algorithmVersion: 'gpx-anchor-v1',
  });

  const portion = extractRoutePortion(
    chapters,
    { chapterIndex: 2, anchor: anchor(2, 1, 10) },
    { chapterIndex: 0, anchor: anchor(0, 0.5, 20) }
  );

  assert.equal(portion.usesLoopOrigin, true);
  assert.deepEqual(portion.chapterSlugs, ['chapter-2', 'chapter-0']);
  assert.deepEqual(
    portion.sequences.map((sequence) => sequence.map((point) => point.longitude)),
    [[1, 0, 0.5]]
  );
});

test('extractRoutePortion keeps an accepted gap as two sequences', () => {
  const first = parseOfficialGpx('<gpx version="1.1"><trk><trkseg><trkpt lat="0" lon="0" /><trkpt lat="0" lon="1" /></trkseg></trk></gpx>');
  const second = parseOfficialGpx('<gpx version="1.1"><trk><trkseg><trkpt lat="0" lon="1.01" /><trkpt lat="0" lon="2" /></trkseg></trk></gpx>');
  const hashes = ['1'.repeat(64), '2'.repeat(64)];
  const gapMetres = distanceWgs84Metres(
    { latitude: 0, longitude: 1 },
    { latitude: 0, longitude: 1.01 }
  );
  const chapters = [first, second].map((document, index) => ({
    slug: `gap-${index}`,
    sourceSha256: hashes[index],
    document,
    junctionAfter: {
      status: index === 0 ? 'accepted_gap' as const : 'blocked' as const,
      sourceSha256: hashes[index],
      nextSourceSha256: hashes[(index + 1) % 2],
      gapMetres: index === 0 ? gapMetres : 0,
    },
  }));
  const anchor = (chapterIndex: number, fraction: number, longitude: number): GpxAnchor => ({
    status: 'validated',
    sourceSha256: hashes[chapterIndex],
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex: 0,
    fraction,
    chainageMetres: fraction,
    projectedLatitude: 0,
    projectedLongitude: longitude,
    distanceToCityMetres: 1,
    algorithmVersion: 'gpx-anchor-v1',
  });

  const portion = extractRoutePortion(
    chapters,
    { chapterIndex: 0, anchor: anchor(0, 0.5, 0.5) },
    { chapterIndex: 1, anchor: anchor(1, 0.5, 1.505) }
  );

  assert.equal(portion.sequences.length, 2);
  assert.equal(portion.warnings[0]?.code, 'accepted_gap');
  assert.ok(Math.abs(portion.warnings[0].gapMetres - gapMetres) < 0.01);
});

test('sha256Hex fingerprints the exact source bytes', () => {
  assert.equal(
    sha256Hex(new TextEncoder().encode('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});
