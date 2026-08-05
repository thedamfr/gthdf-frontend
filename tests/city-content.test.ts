import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatCitySummaryText,
  filterEligibleCityReferences,
  getCityRoleLabel,
  hasPublicCityPage,
  sortCityChapters,
} from '../lib/city-content.ts';

test('hasPublicCityPage requires a slug, the editorial flag and a published version', () => {
  assert.equal(hasPublicCityPage({
    name: 'Calais',
    slug: 'calais',
    hasPublicPage: true,
    publishedAt: '2026-08-05T06:57:00.879Z',
  }), true);
  assert.equal(hasPublicCityPage({
    name: 'Calais',
    slug: 'calais',
    hasPublicPage: true,
    publishedAt: null,
  }), false);
  assert.equal(hasPublicCityPage({
    name: 'Calais',
    slug: 'calais',
    hasPublicPage: false,
    publishedAt: '2026-08-05T06:57:00.879Z',
  }), false);
});

test('formatCitySummaryText renders a chapter without featured intermediates', () => {
  assert.equal(
    formatCitySummaryText([
      { role: 'start', featured: false, city: { name: 'Hirson' } },
      { role: 'intermediate', featured: false, city: { name: 'Vervins' } },
      { role: 'end', featured: false, city: { name: 'Soissons' } },
    ]),
    'Ce chapitre relie Hirson à Soissons.'
  );
});

test('formatCitySummaryText renders one featured intermediate', () => {
  assert.equal(
    formatCitySummaryText([
      { role: 'start', featured: false, city: { name: 'Hirson' } },
      { role: 'intermediate', featured: true, city: { name: 'Guise' } },
      { role: 'end', featured: false, city: { name: 'Soissons' } },
    ]),
    'Ce chapitre relie Hirson à Soissons en passant notamment par Guise.'
  );
});

test('formatCitySummaryText renders several intermediates as a French list', () => {
  assert.equal(
    formatCitySummaryText([
      { role: 'start', featured: false, city: { name: 'Hirson' } },
      { role: 'intermediate', featured: true, city: { name: 'Guise' } },
      { role: 'intermediate', featured: true, city: { name: 'Saint-Quentin' } },
      { role: 'intermediate', featured: true, city: { name: 'Chauny' } },
      { role: 'end', featured: false, city: { name: 'Soissons' } },
    ]),
    'Ce chapitre relie Hirson à Soissons en passant notamment par Guise, Saint-Quentin et Chauny.'
  );
});

test('formatCitySummaryText omits incomplete transition data', () => {
  assert.equal(
    formatCitySummaryText([
      { role: 'start', featured: false, city: { name: 'Hirson' } },
    ]),
    null
  );
});

test('getCityRoleLabel expresses every passage role in French', () => {
  assert.equal(getCityRoleLabel('start'), 'Départ du chapitre');
  assert.equal(getCityRoleLabel('intermediate'), 'Passage intermédiaire');
  assert.equal(getCityRoleLabel('end'), 'Arrivée du chapitre');
});

test('sortCityChapters uses title then slug before displayOrder exists', () => {
  const sorted = sortCityChapters([
    { title: 'Vers la côte', slug: 'vers-la-cote' },
    { title: 'Autour des marais', slug: 'marais-2' },
    { title: 'Autour des marais', slug: 'marais-1' },
  ]);

  assert.deepEqual(sorted.map((chapter) => chapter.slug), [
    'marais-1',
    'marais-2',
    'vers-la-cote',
  ]);
});

test('sortCityChapters prefers displayOrder when the field is available', () => {
  const sorted = sortCityChapters([
    { title: 'Alpha', slug: 'alpha', displayOrder: 20 },
    { title: 'Zulu', slug: 'zulu', displayOrder: 10 },
  ]);

  assert.deepEqual(sorted.map((chapter) => chapter.slug), ['zulu', 'alpha']);
});

test('filterEligibleCityReferences excludes cities without a published chapter', () => {
  const eligible = filterEligibleCityReferences(
    [
      { documentId: 'city-1', slug: 'hirson', updatedAt: '2026-08-04' },
      { documentId: 'city-2', slug: 'guise', updatedAt: '2026-08-04' },
    ],
    new Set(['city-2'])
  );

  assert.deepEqual(eligible.map((city) => city.slug), ['guise']);
});
