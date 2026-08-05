import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeChapterSearchText,
  searchChapters,
  type ChapterFinderItem,
} from '../lib/chapter-search.ts';

function makeChapter(
  overrides: Partial<ChapterFinderItem> & Pick<ChapterFinderItem, 'documentId' | 'slug' | 'displayOrder'>
): ChapterFinderItem {
  return {
    title: `Titre ${overrides.displayOrder}`,
    startName: `Départ ${overrides.displayOrder}`,
    endName: `Arrivée ${overrides.displayOrder}`,
    startStation: `Gare de départ ${overrides.displayOrder}`,
    endStation: `Gare d’arrivée ${overrides.displayOrder}`,
    distance: 100,
    cityPassages: [],
    ...overrides,
  };
}

test('normalizeChapterSearchText folds accents, case, apostrophes, dashes and separators', () => {
  assert.equal(
    normalizeChapterSearchText("  L’Île—d'Aÿ / Côte_d’Opale  "),
    'l ile d ay cote d opale'
  );
});

test('an empty normalized query returns every chapter once in display order', () => {
  const results = searchChapters([
    makeChapter({ documentId: 'chapter-3', slug: 'chapter-3', displayOrder: 3 }),
    makeChapter({ documentId: 'chapter-1', slug: 'chapter-1', displayOrder: 1 }),
    makeChapter({ documentId: 'chapter-2', slug: 'chapter-2', displayOrder: 2 }),
  ], ' — ');

  assert.deepEqual(
    results.map((result) => [result.kind, result.chapter.documentId]),
    [
      ['chapter', 'chapter-1'],
      ['chapter', 'chapter-2'],
      ['chapter', 'chapter-3'],
    ]
  );
});

test('chapter matches cover title, chapter number and both legacy stations', () => {
  const chapters = [makeChapter({
    documentId: 'chapter-4',
    slug: 'hirson-soissons',
    displayOrder: 4,
    title: 'Des forêts à la vallée',
    startName: 'Hirson',
    endName: 'Soissons',
    startStation: 'Gare d’Hirson',
    endStation: 'Gare de Soissons',
  })];

  for (const query of [
    'forets a la vallee',
    'chapitre 4',
    '4',
    'gare d hirson',
    'gare de soissons',
  ]) {
    const results = searchChapters(chapters, query);

    assert.equal(results[0]?.kind, 'chapter', query);
    assert.equal(results[0]?.chapter.documentId, 'chapter-4', query);
  }
});

test('a canonical endpoint city is returned once while its legacy station stays searchable', () => {
  const chapter = makeChapter({
    documentId: 'chapter-1',
    slug: 'lille-arras',
    displayOrder: 1,
    startName: 'Lille',
    endName: 'Arras',
    startStation: 'Lille Flandres',
    endStation: 'Gare d’Arras',
    cityPassages: [
      {
        role: 'start',
        city: { documentId: 'city-lille', name: 'Lille' },
      },
      {
        role: 'end',
        city: { documentId: 'city-arras', name: 'Arras' },
      },
    ],
  });

  const legacyStationResults = searchChapters([chapter], 'Lille Flandres');
  assert.deepEqual(
    legacyStationResults.map((result) => result.kind),
    ['chapter']
  );

  const canonicalCityResults = searchChapters([chapter], 'Lille');
  assert.equal(canonicalCityResults.length, 1);
  assert.equal(canonicalCityResults[0]?.kind, 'city');
  if (canonicalCityResults[0]?.kind === 'city') {
    assert.equal(canonicalCityResults[0].city.documentId, 'city-lille');
  }
});

test('exact matches rank before prefixes, then inclusions, with displayOrder as tie-breaker', () => {
  const results = searchChapters([
    makeChapter({
      documentId: 'contains',
      slug: 'contains',
      displayOrder: 1,
      title: 'Cap sur Calais',
    }),
    makeChapter({
      documentId: 'prefix-later',
      slug: 'prefix-later',
      displayOrder: 4,
      title: 'Calais et les marais',
    }),
    makeChapter({
      documentId: 'exact-later',
      slug: 'exact-later',
      displayOrder: 3,
      title: 'Calais',
    }),
    makeChapter({
      documentId: 'prefix-earlier',
      slug: 'prefix-earlier',
      displayOrder: 2,
      title: 'Calais vers le sud',
    }),
  ], 'calais');

  assert.deepEqual(
    results.map((result) => result.chapter.documentId),
    ['exact-later', 'prefix-earlier', 'prefix-later', 'contains']
  );
});

test('an alias matches a city result while exposing only its canonical name', () => {
  const passageWithIrrelevantPublicationFields = {
    role: 'intermediate' as const,
    featured: false,
    city: {
      documentId: 'city-saint-omer',
      name: 'Saint-Omer',
      alternativeNames: ['St Omer', 'Saint Omer'],
      hasPublicPage: false,
    },
  };
  const chapter = makeChapter({
    documentId: 'chapter-9',
    slug: 'calais-saint-omer',
    displayOrder: 9,
    cityPassages: [passageWithIrrelevantPublicationFields],
  });

  const results = searchChapters([chapter], 'st omer');

  assert.equal(results.length, 1);
  assert.equal(results[0]?.kind, 'city');
  if (results[0]?.kind === 'city') {
    assert.deepEqual(results[0].city, {
      documentId: 'city-saint-omer',
      name: 'Saint-Omer',
      roles: ['intermediate'],
    });
  }
});

test('a shared city yields one result per chapter and repeated passages group their roles', () => {
  const repeatedCity = {
    documentId: 'city-calais',
    name: 'Calais',
    alternativeNames: ['Kales'],
  };
  const results = searchChapters([
    makeChapter({
      documentId: 'chapter-9',
      slug: 'calais-saint-omer',
      displayOrder: 9,
      cityPassages: [
        { role: 'start', city: repeatedCity, featured: true },
        { role: 'intermediate', city: repeatedCity, featured: false },
        { role: 'start', city: repeatedCity, featured: false },
      ],
    }),
    makeChapter({
      documentId: 'chapter-8',
      slug: 'etaples-calais',
      displayOrder: 8,
      cityPassages: [
        { role: 'end', city: repeatedCity, featured: false },
      ],
    }),
  ], 'kales');

  assert.deepEqual(
    results.map((result) => {
      assert.equal(result.kind, 'city');
      return result.kind === 'city'
        ? [result.chapter.documentId, result.city.roles]
        : [];
    }),
    [
      ['chapter-8', ['end']],
      ['chapter-9', ['start', 'intermediate']],
    ]
  );
});

test('a shared city takes precedence over real chapter titles containing its name', () => {
  const calais = {
    documentId: 'city-calais',
    name: 'Calais',
  };
  const chapters = [
    makeChapter({
      documentId: 'chapter-8',
      slug: 'etaples-calais',
      displayOrder: 8,
      title: 'D’Étaples à Calais',
      cityPassages: [{ role: 'end', city: calais }],
    }),
    makeChapter({
      documentId: 'chapter-9',
      slug: 'calais-saint-omer',
      displayOrder: 9,
      title: 'De Calais à Saint-Omer',
      cityPassages: [{ role: 'start', city: calais }],
    }),
  ];

  const cityResults = searchChapters(chapters, 'calais');
  assert.deepEqual(
    cityResults.map((result) => [result.kind, result.chapter.documentId]),
    [
      ['city', 'chapter-8'],
      ['city', 'chapter-9'],
    ]
  );

  const titleResults = searchChapters(chapters, 'etaples');
  assert.deepEqual(
    titleResults.map((result) => [result.kind, result.chapter.documentId]),
    [['chapter', 'chapter-8']]
  );

  const numberResults = searchChapters(chapters, 'chapitre 9');
  assert.deepEqual(
    numberResults.map((result) => [result.kind, result.chapter.documentId]),
    [['chapter', 'chapter-9']]
  );
});

test('city results with equal scores follow their chapter displayOrder then passage order', () => {
  const results = searchChapters([
    makeChapter({
      documentId: 'chapter-2',
      slug: 'chapter-2',
      displayOrder: 2,
      cityPassages: [
        {
          role: 'intermediate',
          city: { documentId: 'city-a', name: 'Saint-Amand' },
        },
      ],
    }),
    makeChapter({
      documentId: 'chapter-1',
      slug: 'chapter-1',
      displayOrder: 1,
      cityPassages: [
        {
          role: 'intermediate',
          city: { documentId: 'city-late', name: 'Saint-Quentin' },
        },
        {
          role: 'intermediate',
          city: { documentId: 'city-early', name: 'Saint-Omer' },
        },
      ],
    }),
  ], 'saint');

  assert.deepEqual(
    results.map((result) => result.kind === 'city' ? result.city.documentId : ''),
    ['city-late', 'city-early', 'city-a']
  );
});

test('the best matching alias participates in exact, prefix and contains ranking', () => {
  const results = searchChapters([
    makeChapter({
      documentId: 'chapter-contains',
      slug: 'chapter-contains',
      displayOrder: 1,
      cityPassages: [{
        role: 'intermediate',
        city: {
          documentId: 'city-contains',
          name: 'Béthune',
          alternativeNames: ['Agglomération de Bruay'],
        },
      }],
    }),
    makeChapter({
      documentId: 'chapter-prefix',
      slug: 'chapter-prefix',
      displayOrder: 2,
      cityPassages: [{
        role: 'intermediate',
        city: {
          documentId: 'city-prefix',
          name: 'Bruay-la-Buissière',
          alternativeNames: ['Bruay en Artois'],
        },
      }],
    }),
    makeChapter({
      documentId: 'chapter-exact',
      slug: 'chapter-exact',
      displayOrder: 3,
      cityPassages: [{
        role: 'intermediate',
        city: {
          documentId: 'city-exact',
          name: 'Bruay-sur-l’Escaut',
          alternativeNames: ['Bruay'],
        },
      }],
    }),
  ], 'bruay');

  assert.deepEqual(
    results.map((result) => result.kind === 'city' ? result.city.documentId : ''),
    ['city-exact', 'city-prefix', 'city-contains']
  );
});
