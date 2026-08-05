import assert from 'node:assert/strict';
import test from 'node:test';

import { distanceToChapterMeters } from '../lib/chapter-proximity.ts';
import {
  SIMPLIFICATION_TOLERANCE_METERS,
  GpxParseError,
  buildProximityIndex,
  computeGeometryBoundingBox,
  parseGpxSegments,
  simplifyGpxSegment,
  type GpxChapterSource,
  type GpxMediaMetadata,
} from '../lib/gpx-proximity-index.ts';
import type {
  GeoPoint,
  ProximityIndexChapter,
  ProximityTrace,
} from '../lib/proximity-types.ts';

function gpxWithTrack(points: GeoPoint[]): string {
  return `<gpx><trk><trkseg>${points
    .map(([longitude, latitude]) => (
      `<trkpt lat="${latitude}" lon="${longitude}" />`
    ))
    .join('')}</trkseg></trk></gpx>`;
}

function media(id: number, updatedAt = '2026-08-05T10:00:00.000Z'): GpxMediaMetadata {
  return {
    id,
    documentId: `media-${id}`,
    hash: `hash-${id}`,
    updatedAt,
  };
}

function chapterSource(
  displayOrder: number,
  traces: GpxChapterSource['traces']
): GpxChapterSource {
  return {
    documentId: `chapter-${displayOrder}`,
    slug: `chapter-${displayOrder}`,
    displayOrder,
    traces,
  };
}

function proximityChapter(
  segments: GeoPoint[][]
): ProximityIndexChapter {
  const trace: ProximityTrace = {
    direction: 'AB',
    segments,
    boundingBox: computeGeometryBoundingBox(segments)!,
  };

  return {
    documentId: 'chapter',
    slug: 'chapter',
    displayOrder: 1,
    boundingBox: trace.boundingBox,
    traces: [trace],
  };
}

test('parseGpxSegments reads every track segment and route without joining boundaries', () => {
  const segments = parseGpxSegments(`<?xml version="1.0"?>
    <gpx xmlns="http://www.topografix.com/GPX/1/1">
      <trk><trkseg>
        <trkpt lat="50" lon="2" />
        <trkpt lat="50.1" lon="2.1" />
      </trkseg><trkseg>
        <trkpt lat="50.2" lon="2.2" />
      </trkseg></trk>
      <rte>
        <rtept lat="50.3" lon="2.3" />
        <rtept lat="50.4" lon="2.4" />
      </rte>
    </gpx>`);

  assert.deepEqual(segments, [
    [[2, 50], [2.1, 50.1]],
    [[2.2, 50.2]],
    [[2.3, 50.3], [2.4, 50.4]],
  ]);
});

test('parseGpxSegments rejects malformed XML and a non-GPX root', () => {
  assert.throws(
    () => parseGpxSegments('<gpx><trk></gpx>'),
    GpxParseError
  );
  assert.throws(
    () => parseGpxSegments('<root />'),
    GpxParseError
  );
});

test('parseGpxSegments rejects invalid coordinates but retains a one-point segment', () => {
  const segments = parseGpxSegments(`<gpx><trk><trkseg>
    <trkpt lon="2" />
    <trkpt lat="" lon="2" />
    <trkpt lat="NaN" lon="2" />
    <trkpt lat="91" lon="2" />
    <trkpt lat="50" lon="181" />
    <trkpt lat="50" lon="2" />
  </trkseg><trkseg /></trk></gpx>`);

  assert.deepEqual(segments, [[[2, 50]]]);
});

test('simplifyGpxSegment preserves endpoints and the twenty metre lateral tolerance', () => {
  const tenMeterLatitude = 10 / 111_195;
  const thirtyMeterLatitude = 30 / 111_195;
  const belowTolerance: GeoPoint[] = [
    [2, 50],
    [2.001, 50 + tenMeterLatitude],
    [2.002, 50],
  ];
  const aboveTolerance: GeoPoint[] = [
    [2, 50],
    [2.001, 50 + thirtyMeterLatitude],
    [2.002, 50],
  ];

  assert.equal(SIMPLIFICATION_TOLERANCE_METERS, 20);
  assert.deepEqual(simplifyGpxSegment(belowTolerance), [
    belowTolerance[0],
    belowTolerance[2],
  ]);
  assert.deepEqual(simplifyGpxSegment(aboveTolerance), aboveTolerance);
  assert.deepEqual(simplifyGpxSegment([[2, 50]]), [[2, 50]]);
});

test('computeGeometryBoundingBox covers every segment without connecting them', () => {
  assert.deepEqual(computeGeometryBoundingBox([
    [[2, 50], [3, 51]],
    [[-1, 49]],
  ]), [-1, 49, 3, 51]);
  assert.equal(computeGeometryBoundingBox([[]]), null);
});

test('buildProximityIndex accepts AB and BA independently and omits unusable chapters', () => {
  const index = buildProximityIndex([
    chapterSource(2, {
      AB: {
        xml: gpxWithTrack([[2, 50], [3, 51]]),
        media: media(2),
      },
      BA: {
        xml: '<gpx><trk></gpx>',
        media: media(3),
      },
    }),
    chapterSource(3, {
      AB: {
        xml: '<gpx><trk><trkseg /></trk></gpx>',
        media: media(4),
      },
    }),
    chapterSource(1, {
      BA: {
        xml: '<gpx><rte><rtept lat="49" lon="1" /></rte></gpx>',
        media: media(1),
      },
    }),
  ]);

  assert.equal(index.schemaVersion, 1);
  assert.equal(index.partial, true);
  assert.deepEqual(
    index.chapters.map(({ displayOrder }) => displayOrder),
    [1, 2]
  );
  assert.deepEqual(
    index.chapters.map(({ traces }) => traces.map(({ direction }) => direction)),
    [['BA'], ['AB']]
  );
  assert.deepEqual(index.chapters[0]?.boundingBox, [1, 49, 1, 49]);
  assert.deepEqual(index.chapters[1]?.traces[0]?.boundingBox, [2, 50, 3, 51]);
  assert.match(index.revision, /^[a-f0-9]{64}$/);
});

test('buildProximityIndex reports a complete index when both directions are usable', () => {
  const index = buildProximityIndex([
    chapterSource(1, {
      AB: { xml: gpxWithTrack([[2, 50]]), media: media(1) },
      BA: { xml: gpxWithTrack([[2.1, 50.1]]), media: media(2) },
    }),
  ]);

  assert.equal(index.partial, false);
  assert.deepEqual(index.chapters[0]?.boundingBox, [2, 50, 2.1, 50.1]);
});

test('the index revision is input-order independent and changes with media metadata', () => {
  const first = chapterSource(1, {
    AB: { xml: gpxWithTrack([[2, 50]]), media: media(1) },
    BA: { xml: gpxWithTrack([[2, 50]]), media: media(2) },
  });
  const second = chapterSource(2, {
    AB: { xml: gpxWithTrack([[3, 51]]), media: media(3) },
    BA: { xml: gpxWithTrack([[3, 51]]), media: media(4) },
  });

  const originalRevision = buildProximityIndex([first, second]).revision;
  const reorderedRevision = buildProximityIndex([second, first]).revision;
  const changedRevision = buildProximityIndex([
    first,
    chapterSource(2, {
      ...second.traces,
      BA: {
        ...second.traces.BA!,
        media: media(4, '2026-08-05T11:00:00.000Z'),
      },
    }),
  ]).revision;

  assert.equal(reorderedRevision, originalRevision);
  assert.notEqual(changedRevision, originalRevision);
});

test('simplified geometry stays within the twenty-five metre distance budget', () => {
  const rawSegment = Array.from({ length: 101 }, (_, index): GeoPoint => {
    const progress = index / 100;

    return [
      2 + progress * 0.1,
      50 + Math.sin(progress * Math.PI * 2) * 0.00015,
    ];
  });
  const simplifiedSegment = simplifyGpxSegment(rawSegment);
  const rawChapter = proximityChapter([rawSegment]);
  const simplifiedChapter = proximityChapter([simplifiedSegment]);

  assert.ok(simplifiedSegment.length < rawSegment.length);

  for (let index = 0; index < rawSegment.length; index += 5) {
    const sourcePoint = rawSegment[index];
    const checks: GeoPoint[] = [
      sourcePoint,
      [sourcePoint[0], sourcePoint[1] + 0.0003],
    ];

    for (const point of checks) {
      const rawDistance = distanceToChapterMeters(point, rawChapter)!;
      const simplifiedDistance = distanceToChapterMeters(point, simplifiedChapter)!;

      assert.ok(
        Math.abs(rawDistance - simplifiedDistance) <= 25,
        `distance error ${Math.abs(rawDistance - simplifiedDistance)}m at point ${point}`
      );
    }
  }
});
