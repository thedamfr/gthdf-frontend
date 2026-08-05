type DisplayOrderChapter = {
  title: string;
  slug: string;
  displayOrder?: number | null;
};

function validDisplayOrder(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

export function hasCompleteDisplayOrder(chapters: DisplayOrderChapter[]): boolean {
  const orders = chapters.map((chapter) => validDisplayOrder(chapter.displayOrder));

  return orders.every((order): order is number => order !== null)
    && new Set(orders).size === chapters.length
    && [...orders].sort((a, b) => a - b).every((order, index) => order === index + 1);
}

export function sortChaptersByDisplayOrder<T extends DisplayOrderChapter>(chapters: T[]): T[] {
  return [...chapters].sort((chapterA, chapterB) => {
    const orderA = validDisplayOrder(chapterA.displayOrder) ?? Number.POSITIVE_INFINITY;
    const orderB = validDisplayOrder(chapterB.displayOrder) ?? Number.POSITIVE_INFINITY;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const titleComparison = chapterA.title.localeCompare(chapterB.title, 'fr', {
      sensitivity: 'base',
    });

    return titleComparison || chapterA.slug.localeCompare(chapterB.slug, 'fr');
  });
}

/**
 * Return a stable, contiguous public order during a partial CMS deployment.
 * Valid CMS values are preserved; invalid sets fall back to deterministic
 * title/slug ordering and temporary 1..N values.
 */
export function assignStableDisplayOrder<T extends DisplayOrderChapter>(
  chapters: T[]
): Array<T & { displayOrder: number }> {
  const preserveDisplayOrder = hasCompleteDisplayOrder(chapters);

  return sortChaptersByDisplayOrder(chapters).map((chapter, index) => ({
    ...chapter,
    displayOrder: preserveDisplayOrder ? chapter.displayOrder as number : index + 1,
  }));
}
