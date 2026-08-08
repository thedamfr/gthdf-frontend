import assert from 'node:assert/strict';
import test from 'node:test';

import {
  geometryBounds,
  parseItineraryDisplayGeometry,
} from '../lib/itineraries/geometry.ts';

function geometry() {
  return {
    version: 1,
    revisionKey: 'revision-1',
    algorithmVersion: 'catalogue-v1',
    sequences: [
      { coordinates: [[2.1, 50.9, 4], [2.2, 50.8, 8]] },
      { coordinates: [[2.3, 50.7], [2.4, 50.6]] },
    ],
    elevationProfile: [
      {
        sequenceIndex: 0,
        points: [
          { distanceMetres: 0, elevationMetres: 4 },
          { distanceMetres: 500, elevationMetres: 8 },
        ],
      },
      {
        sequenceIndex: 1,
        points: [
          { distanceMetres: 500, elevationMetres: 7 },
          { distanceMetres: 1_000, elevationMetres: 6 },
        ],
      },
    ],
  };
}

test('the display geometry parser preserves separate sequences and qualified elevation', () => {
  const parsed = parseItineraryDisplayGeometry(geometry(), {
    revisionKey: 'revision-1',
    algorithmVersion: 'catalogue-v1',
  });
  assert.ok(parsed);
  assert.equal(parsed.sequences.length, 2);
  assert.deepEqual(geometryBounds(parsed), {
    minLongitude: 2.1,
    maxLongitude: 2.4,
    minLatitude: 50.6,
    maxLatitude: 50.9,
  });
});

test('the parser rejects extra private fields and malformed coordinates', () => {
  assert.equal(parseItineraryDisplayGeometry({ ...geometry(), anchors: [] }), null);

  const invalid = geometry();
  invalid.sequences[1].coordinates[1] = [220, 50.6];
  assert.equal(parseItineraryDisplayGeometry(invalid), null);
});

test('the parser rejects a non-monotonic elevation profile', () => {
  const invalid = geometry();
  invalid.elevationProfile[1].points[1].distanceMetres = 500;
  assert.equal(parseItineraryDisplayGeometry(invalid), null);
});

test('the parser rejects a profile that resets cumulative distance after a rupture', () => {
  const invalid = geometry();
  invalid.elevationProfile[1].points[0].distanceMetres = 0;
  invalid.elevationProfile[1].points[1].distanceMetres = 400;
  assert.equal(parseItineraryDisplayGeometry(invalid), null);
});

test('the parser preserves a valid singleton sequence emitted by the CMS', () => {
  const singleton = geometry();
  singleton.sequences[0].coordinates = [[2.1, 50.9, 4]];
  singleton.elevationProfile[0].points = [
    { distanceMetres: 0, elevationMetres: 4 },
  ];
  singleton.elevationProfile[1].points = [
    { distanceMetres: 0, elevationMetres: 7 },
    { distanceMetres: 500, elevationMetres: 6 },
  ];

  const parsed = parseItineraryDisplayGeometry(singleton);
  assert.ok(parsed);
  assert.equal(parsed.sequences[0].coordinates.length, 1);
  assert.equal(parsed.elevationProfile?.[0].points.length, 1);
});
