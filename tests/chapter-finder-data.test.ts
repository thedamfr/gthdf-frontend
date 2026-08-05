import assert from 'node:assert/strict';
import test from 'node:test';

import { buildChapterFinderItems } from '../lib/chapter-finder-data.ts';

test('buildChapterFinderItems exposes only published related cities and uses canonical endpoints', () => {
  const items = buildChapterFinderItems([{
    documentId: 'chapter-1',
    slug: 'lille-arras',
    displayOrder: 1,
    title: 'Premier chapitre',
    startStation: 'Lille Flandres',
    endStation: 'Gare d’Arras',
    distance: 115,
    cityPassages: [
      {
        role: 'start',
        featured: false,
        city: {
          documentId: 'city-lille',
          name: 'Lille',
          alternativeNames: ['Ryssel', 42],
          hasPublicPage: false,
          publishedAt: '2026-08-05T12:00:00.000Z',
        },
      },
      {
        role: 'intermediate',
        featured: false,
        city: {
          documentId: 'city-draft',
          name: 'Ville brouillon',
          publishedAt: null,
        },
      },
      {
        role: 'end',
        featured: false,
        city: {
          documentId: 'city-arras',
          name: 'Arras',
          publishedAt: '2026-08-05T12:00:00.000Z',
        },
      },
    ],
  }]);

  assert.equal(items[0]?.startName, 'Lille');
  assert.equal(items[0]?.endName, 'Arras');
  assert.equal(items[0]?.startStation, 'Lille Flandres');
  assert.equal(items[0]?.endStation, 'Gare d’Arras');
  assert.deepEqual(items[0]?.cityPassages, [
    {
      role: 'start',
      city: {
        documentId: 'city-lille',
        name: 'Lille',
        alternativeNames: ['Ryssel'],
      },
    },
    {
      role: 'end',
      city: {
        documentId: 'city-arras',
        name: 'Arras',
      },
    },
  ]);
});

test('buildChapterFinderItems falls back to legacy stations and deterministic numbering', () => {
  const items = buildChapterFinderItems([
    {
      documentId: 'chapter-zulu',
      slug: 'zulu',
      displayOrder: null,
      title: 'Zulu',
      startStation: 'Départ Z',
      endStation: 'Arrivée Z',
      distance: 90,
      cityPassages: [],
    },
    {
      documentId: 'chapter-alpha',
      slug: 'alpha',
      displayOrder: null,
      title: 'Alpha',
      startStation: 'Départ A',
      endStation: 'Arrivée A',
      distance: 80,
      cityPassages: [],
    },
  ]);

  assert.deepEqual(
    items.map((item) => [
      item.slug,
      item.displayOrder,
      item.startName,
      item.endName,
      item.startStation,
      item.endStation,
    ]),
    [
      ['alpha', 1, 'Départ A', 'Arrivée A', 'Départ A', 'Arrivée A'],
      ['zulu', 2, 'Départ Z', 'Arrivée Z', 'Départ Z', 'Arrivée Z'],
    ]
  );
});
