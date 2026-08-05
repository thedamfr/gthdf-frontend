import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assignStableDisplayOrder,
  sortChaptersByDisplayOrder,
} from '../lib/chapter-order.ts';

function chapter(
  id: number,
  slug: string,
  displayOrder: number | null,
  nextId?: number,
) {
  return {
    id,
    documentId: `chapter-${id}`,
    title: slug.replaceAll('-', ' '),
    slug,
    startStation: 'Départ',
    endStation: 'Arrivée',
    distance: 100,
    introSentence: 'Introduction',
    displayOrder,
    ...(nextId ? {
      nextChapter: {
        id: nextId,
        slug: `chapter-${nextId}`,
        title: `Chapitre ${nextId}`,
      },
    } : {}),
  };
}

test('sortChaptersByDisplayOrder ignores a cyclic relation and shuffled API order', () => {
  const chapters = [
    chapter(3, 'conde-hirson', 3, 1),
    chapter(1, 'lille-arras', 1, 2),
    chapter(2, 'arras-conde', 2, 3),
  ];

  assert.deepEqual(
    sortChaptersByDisplayOrder(chapters).map((item) => item.slug),
    ['lille-arras', 'arras-conde', 'conde-hirson']
  );
});

test('sortChaptersByDisplayOrder places invalid transitional values last deterministically', () => {
  const chapters = [
    chapter(1, 'zulu', null),
    chapter(2, 'beta', 2),
    chapter(3, 'alpha', null),
    chapter(4, 'invalid-zero', 0),
    chapter(5, 'first', 1),
  ];

  assert.deepEqual(
    sortChaptersByDisplayOrder(chapters).map((item) => item.slug),
    ['first', 'beta', 'alpha', 'invalid-zero', 'zulu']
  );
});

test('assignStableDisplayOrder preserves a complete sequence', () => {
  const chapters = [
    chapter(2, 'second', 2),
    chapter(1, 'first', 1),
  ];

  assert.deepEqual(
    assignStableDisplayOrder(chapters).map(({ slug, displayOrder }) => ({ slug, displayOrder })),
    [
      { slug: 'first', displayOrder: 1 },
      { slug: 'second', displayOrder: 2 },
    ]
  );
});

test('assignStableDisplayOrder repairs invalid transitional values deterministically', () => {
  const chapters = [
    chapter(3, 'zulu', null),
    chapter(2, 'beta', 1),
    chapter(1, 'alpha', 1),
  ];

  assert.deepEqual(
    assignStableDisplayOrder(chapters).map(({ slug, displayOrder }) => ({ slug, displayOrder })),
    [
      { slug: 'alpha', displayOrder: 1 },
      { slug: 'beta', displayOrder: 2 },
      { slug: 'zulu', displayOrder: 3 },
    ]
  );
});
