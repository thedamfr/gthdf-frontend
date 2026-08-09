import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRouteMapData,
  isItineraryBasemapEnabled,
  OPEN_FREE_MAP_STYLE_URL,
  transformOpenFreeMapRequest,
} from '../lib/itineraries/map.ts';
import type { ItineraryDisplayGeometry } from '../lib/itineraries/types.ts';

const geometry: ItineraryDisplayGeometry = {
  version: 1,
  revisionKey: 'revision-map-1',
  algorithmVersion: 'catalogue-v1',
  sequences: [
    { coordinates: [[1.8, 50.9, 12], [2, 50.8, 18]] },
    { coordinates: [[2.1, 50.7], [2.3, 50.6]] },
    { coordinates: [[2.4, 50.5], [2.6, 50.4, 8]] },
  ],
  elevationProfile: null,
};

test('map data preserves route sequences and numbers both sides of every gap', () => {
  const data = buildRouteMapData(geometry);

  assert.equal(data.route.type, 'FeatureCollection');
  assert.equal(data.route.features.length, 3);
  assert.deepEqual(
    data.route.features.map((feature) => feature.geometry.coordinates),
    [
      [[1.8, 50.9], [2, 50.8]],
      [[2.1, 50.7], [2.3, 50.6]],
      [[2.4, 50.5], [2.6, 50.4]],
    ]
  );
  assert.deepEqual(
    data.route.features.map((feature) => feature.properties.sequenceIndex),
    [0, 1, 2]
  );
  assert.deepEqual(
    data.gaps.features.map((feature) => ({
      coordinates: feature.geometry.coordinates,
      label: feature.properties.label,
      side: feature.properties.side,
    })),
    [
      { coordinates: [2, 50.8], label: '1', side: 'before' },
      { coordinates: [2.1, 50.7], label: '1', side: 'after' },
      { coordinates: [2.3, 50.6], label: '2', side: 'before' },
      { coordinates: [2.4, 50.5], label: '2', side: 'after' },
    ]
  );
});

test('map data exposes endpoints and bounds for a deterministic recenter action', () => {
  const data = buildRouteMapData(geometry);

  assert.deepEqual(data.bounds, [[1.8, 50.4], [2.6, 50.9]]);
  assert.deepEqual(data.endpoints.features.map((feature) => ({
    coordinates: feature.geometry.coordinates,
    kind: feature.properties.kind,
  })), [
    { coordinates: [1.8, 50.9], kind: 'departure' },
    { coordinates: [2.6, 50.4], kind: 'arrival' },
  ]);
});

test('a singleton sequence remains an endpoint without producing invalid line data', () => {
  const singleton: ItineraryDisplayGeometry = {
    ...geometry,
    sequences: [{ coordinates: [[2.1, 50.9, 4]] }],
  };

  const data = buildRouteMapData(singleton);

  assert.equal(data.route.features.length, 0);
  assert.equal(data.gaps.features.length, 0);
  assert.deepEqual(data.bounds, [[2.1, 50.9], [2.1, 50.9]]);
  assert.deepEqual(
    data.endpoints.features.map((feature) => feature.geometry.coordinates),
    [[2.1, 50.9], [2.1, 50.9]]
  );
});

test('the basemap feature flag fails closed unless explicitly enabled', () => {
  assert.equal(isItineraryBasemapEnabled(undefined), false);
  assert.equal(isItineraryBasemapEnabled(''), false);
  assert.equal(isItineraryBasemapEnabled('false'), false);
  assert.equal(isItineraryBasemapEnabled('TRUE'), false);
  assert.equal(isItineraryBasemapEnabled('true'), true);
});

test('the provider request policy allows only the fixed OpenFreeMap HTTPS origin', () => {
  assert.equal(
    OPEN_FREE_MAP_STYLE_URL,
    'https://tiles.openfreemap.org/styles/positron'
  );
  assert.deepEqual(transformOpenFreeMapRequest(OPEN_FREE_MAP_STYLE_URL), {
    url: OPEN_FREE_MAP_STYLE_URL,
  });
  assert.deepEqual(
    transformOpenFreeMapRequest('https://tiles.openfreemap.org/fonts/Noto%20Sans/0-255.pbf'),
    { url: 'https://tiles.openfreemap.org/fonts/Noto%20Sans/0-255.pbf' }
  );

  for (const url of [
    'http://tiles.openfreemap.org/styles/positron',
    'https://tiles.openfreemap.org.attacker.example/styles/positron',
    'https://user:password@tiles.openfreemap.org/styles/positron',
    'https://example.org/tiles/1/2/3.pbf',
    '/api/private-map-proxy',
  ]) {
    assert.throws(
      () => transformOpenFreeMapRequest(url),
      /map_provider_url_rejected/
    );
  }
});
