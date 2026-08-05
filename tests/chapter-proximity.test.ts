import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PROXIMITY_THRESHOLDS,
  classifyChapterDistances,
  classifyChapterProximity,
  distanceToChapterMeters,
  distanceToSegmentMeters,
  formatProximityDistance,
  rankChapterDistances,
  type ChapterDistance,
} from '../lib/chapter-proximity.ts';
import type {
  GeoPoint,
  ProximityIndexChapter,
  ProximityTrace,
  TraceDirection,
} from '../lib/proximity-types.ts';

const boundingBox = [-180, -90, 180, 90] as const;

function trace(direction: TraceDirection, segments: GeoPoint[][]): ProximityTrace {
  return {
    direction,
    segments,
    boundingBox: [...boundingBox],
  };
}

function chapter(
  displayOrder: number,
  traces: ProximityTrace[]
): ProximityIndexChapter {
  return {
    documentId: `chapter-${displayOrder}`,
    slug: `chapter-${displayOrder}`,
    displayOrder,
    boundingBox: [...boundingBox],
    traces,
  };
}

function chapterDistance(
  displayOrder: number,
  distanceMeters: number
): ChapterDistance {
  return {
    documentId: `chapter-${displayOrder}`,
    slug: `chapter-${displayOrder}`,
    displayOrder,
    distanceMeters,
  };
}

test('distanceToSegmentMeters measures the segment instead of the nearest waypoint', () => {
  const distance = distanceToSegmentMeters(
    [0, 0.001],
    [-0.01, 0],
    [0.01, 0]
  );

  assert.ok(distance > 100 && distance < 120);
});

test('distanceToChapterMeters never joins separate GPX segments', () => {
  const distance = distanceToChapterMeters(
    [0.005, 0.01],
    chapter(1, [
      trace('AB', [
        [[0, 0], [0, 0.01]],
        [[0.01, 0.01], [0.01, 0.02]],
      ]),
    ])
  );

  assert.ok(distance !== null);
  assert.ok(distance > 540 && distance < 570);
});

test('distanceToChapterMeters keeps the minimum across AB and BA', () => {
  const distance = distanceToChapterMeters(
    [0, 0],
    chapter(1, [
      trace('AB', [[[-0.01, 1], [0.01, 1]]]),
      trace('BA', [[[-0.01, 0.001], [0.01, 0.001]]]),
    ])
  );

  assert.ok(distance !== null);
  assert.ok(distance > 100 && distance < 120);
});

test('rankChapterDistances resolves equal distances with displayOrder', () => {
  const chapters = [
    chapter(2, [trace('AB', [[[-0.01, 0], [0.01, 0]]])]),
    chapter(1, [trace('AB', [[[-0.01, 0], [0.01, 0]]])]),
  ];

  assert.deepEqual(
    rankChapterDistances([0, 0.001], chapters).map(({ displayOrder }) => displayOrder),
    [1, 2]
  );
});

test('proximity thresholds expose the PRD constants from one place', () => {
  assert.deepEqual(PROXIMITY_THRESHOLDS, {
    nearDistanceMeters: 1_000,
    maximumDistanceMeters: 50_000,
    minimumAmbiguityMeters: 250,
    maximumUsableAccuracyMeters: 5_000,
    maximumNearAccuracyMeters: 1_000,
    maximumResults: 3,
  });
});

test('classifyChapterDistances includes the exact ambiguity boundary', () => {
  const classification = classifyChapterDistances([
    chapterDistance(1, 1_000),
    chapterDistance(2, 1_250),
    chapterDistance(3, 1_250.001),
  ], 20);

  assert.equal(classification.status, 'ambiguous');
  assert.deepEqual(
    classification.results.map(({ displayOrder }) => displayOrder),
    [1, 2]
  );
});

test('classifyChapterDistances uses accuracy for ambiguity and limits alternatives to three', () => {
  const classification = classifyChapterDistances([
    chapterDistance(1, 1_000),
    chapterDistance(2, 1_400),
    chapterDistance(3, 1_500),
    chapterDistance(4, 1_600),
    chapterDistance(5, 1_700),
  ], 500);

  assert.equal(classification.status, 'ambiguous');
  assert.deepEqual(
    classification.results.map(({ displayOrder }) => displayOrder),
    [1, 2, 3]
  );
});

test('classifyChapterDistances rejects only accuracy above five kilometres', () => {
  const exactBoundary = classifyChapterDistances([
    chapterDistance(1, 1_000),
  ], 5_000);
  const aboveBoundary = classifyChapterDistances([
    chapterDistance(1, 1_000),
  ], 5_000.001);

  assert.equal(exactBoundary.status, 'single');
  assert.equal(exactBoundary.accuracyIsImprecise, true);
  assert.equal(aboveBoundary.status, 'imprecise');
  assert.deepEqual(aboveBoundary.results, []);
});

test('classifyChapterDistances rejects only a nearest result beyond fifty kilometres', () => {
  assert.equal(
    classifyChapterDistances([chapterDistance(1, 50_000)], 20).status,
    'single'
  );
  assert.equal(
    classifyChapterDistances([chapterDistance(1, 50_000.001)], 20).status,
    'out-of-area'
  );
});

test('classifyChapterDistances applies exact near and imprecise-warning boundaries', () => {
  const near = classifyChapterDistances([chapterDistance(1, 800)], 200);
  const notNear = classifyChapterDistances([chapterDistance(1, 800)], 200.001);
  const warningBoundary = classifyChapterDistances([
    chapterDistance(1, 2_000),
  ], 250);

  assert.equal(near.nearestIsNear, true);
  assert.equal(near.accuracyIsImprecise, false);
  assert.equal(notNear.nearestIsNear, false);
  assert.equal(warningBoundary.accuracyIsImprecise, true);
});

test('classifyChapterProximity is a client-ready position-to-result facade', () => {
  const classification = classifyChapterProximity([0, 0], 20, [
    chapter(2, [trace('AB', [[[-0.01, 1], [0.01, 1]]])]),
    chapter(1, [trace('AB', [[[-0.01, 0.001], [0.01, 0.001]]])]),
  ]);

  assert.equal(classification.status, 'single');
  assert.equal(classification.results[0]?.documentId, 'chapter-1');
  assert.equal(classification.nearestIsNear, true);
});

test('classifyChapterProximity reports an unavailable index without valid segments', () => {
  const classification = classifyChapterProximity([0, 0], 20, [
    chapter(1, [trace('AB', [[]])]),
  ]);

  assert.equal(classification.status, 'unavailable');
  assert.deepEqual(classification.results, []);
});

test('formatProximityDistance follows the three PRD rounding bands', () => {
  assert.equal(formatProximityDistance(324), '300 m');
  assert.equal(formatProximityDistance(326), '350 m');
  assert.equal(formatProximityDistance(999), '1 000 m');
  assert.equal(formatProximityDistance(1_000), '1,0 km');
  assert.equal(formatProximityDistance(9_450), '9,5 km');
  assert.equal(formatProximityDistance(10_000), '10 km');
  assert.equal(formatProximityDistance(12_350), '12 km');
});
