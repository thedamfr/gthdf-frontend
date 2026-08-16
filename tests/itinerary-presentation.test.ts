import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatItineraryDirection,
  formatElevation,
  formatKilometres,
  selectRepresentativeCities,
} from '../lib/itineraries/presentation.ts';

test('public metrics use the documented display precision', () => {
  assert.equal(formatKilometres(12_345), '12,3 km');
  assert.equal(formatElevation(426), '~430 m');
});

test('itinerary directions apply French contractions and editorial overrides', () => {
  const cases = [
    ['Le Touquet-Paris-Plage', 'Camiers', 'du Touquet-Paris-Plage à Camiers'],
    ['Camiers', 'Wimereux', 'de Camiers à Wimereux'],
    ['Noyelles-sur-Mer', 'Le Crotoy', 'de Noyelles-sur-Mer au Crotoy'],
    ['Abbeville', 'Le Crotoy', 'd’Abbeville au Crotoy'],
    ['Lens', 'Oignies', 'de Lens à Oignies'],
    ['Éleu-dit-Leauwette', 'La Fère', 'd’Éleu-dit-Leauwette à La Fère'],
  ] as const;

  for (const [departure, arrival, expected] of cases) {
    assert.equal(
      formatItineraryDirection({ name: departure }, { name: arrival }),
      expected
    );
  }

  assert.equal(
    formatItineraryDirection(
      { name: 'Hondschoote', fromLabel: 'de Hondschoote' },
      { name: 'Le Quesnoy', toLabel: 'au Quesnoy' },
      { capitalize: true }
    ),
    'De Hondschoote au Quesnoy'
  );
});

test('representative cities stay ordered and always include both endpoints', () => {
  const cities = Array.from({ length: 30 }, (_, index) => ({
    documentId: `city-${index}`,
    name: `Ville ${index}`,
    href: null,
  }));
  const selected = selectRepresentativeCities(cities, 6);
  assert.equal(selected.length, 6);
  assert.equal(selected[0].documentId, 'city-0');
  assert.equal(selected[5].documentId, 'city-29');
  assert.deepEqual(selected, [...selected].sort((a, b) => (
    Number(a.documentId.slice(5)) - Number(b.documentId.slice(5))
  )));
});
