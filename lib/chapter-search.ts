export type ChapterFinderCityRole = 'start' | 'intermediate' | 'end';

export interface ChapterFinderCity {
  documentId: string;
  name: string;
  alternativeNames?: readonly string[];
}

export interface ChapterFinderCityPassage {
  role: ChapterFinderCityRole;
  city: ChapterFinderCity;
}

/**
 * Minimal public DTO consumed by the chapter finder.
 *
 * `startName` and `endName` are resolved by the server from canonical cities,
 * with legacy stations used as a fallback during the data transition. The
 * original station labels remain available as chapter-only search terms.
 */
export interface ChapterFinderItem {
  documentId: string;
  slug: string;
  displayOrder: number;
  title: string;
  startName: string;
  endName: string;
  startStation: string;
  endStation: string;
  distance: number;
  cityPassages: readonly ChapterFinderCityPassage[];
}

export interface ChapterSearchChapterResult {
  kind: 'chapter';
  resultId: string;
  chapter: ChapterFinderItem;
}

export interface ChapterSearchCityResult {
  kind: 'city';
  resultId: string;
  chapter: ChapterFinderItem;
  city: {
    documentId: string;
    name: string;
    roles: ChapterFinderCityRole[];
  };
}

export type ChapterSearchResult =
  | ChapterSearchChapterResult
  | ChapterSearchCityResult;

type MatchRank = 0 | 1 | 2;

interface RankedResult {
  result: ChapterSearchResult;
  matchRank: MatchRank;
  passageOrder: number;
  inputOrder: number;
}

interface AggregatedCity {
  documentId: string;
  name: string;
  alternativeNames: string[];
  roles: ChapterFinderCityRole[];
  passageOrder: number;
}

const combiningMarksPattern = /\p{M}+/gu;
const separatorsPattern = /[^\p{L}\p{N}]+/gu;

export function normalizeChapterSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(combiningMarksPattern, '')
    .toLocaleLowerCase('fr')
    .replace(separatorsPattern, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getMatchRank(label: string, normalizedQuery: string): MatchRank | null {
  const normalizedLabel = normalizeChapterSearchText(label);

  if (!normalizedLabel.includes(normalizedQuery)) {
    return null;
  }

  if (normalizedLabel === normalizedQuery) {
    return 0;
  }

  if (normalizedLabel.startsWith(normalizedQuery)) {
    return 1;
  }

  return 2;
}

function getBestMatchRank(labels: readonly string[], normalizedQuery: string): MatchRank | null {
  let bestRank: MatchRank | null = null;

  for (const label of labels) {
    const rank = getMatchRank(label, normalizedQuery);
    if (rank !== null && (bestRank === null || rank < bestRank)) {
      bestRank = rank;
    }
  }

  return bestRank;
}

function compareChapterOrder(
  chapterA: ChapterFinderItem,
  chapterB: ChapterFinderItem,
  inputOrderA: number,
  inputOrderB: number
): number {
  if (chapterA.displayOrder !== chapterB.displayOrder) {
    return chapterA.displayOrder - chapterB.displayOrder;
  }

  const titleComparison = chapterA.title.localeCompare(chapterB.title, 'fr', {
    sensitivity: 'base',
  });
  if (titleComparison !== 0) {
    return titleComparison;
  }

  const slugComparison = chapterA.slug.localeCompare(chapterB.slug, 'fr', {
    sensitivity: 'base',
  });
  return slugComparison || inputOrderA - inputOrderB;
}

function createChapterResult(chapter: ChapterFinderItem): ChapterSearchChapterResult {
  return {
    kind: 'chapter',
    resultId: `chapter:${chapter.documentId}`,
    chapter,
  };
}

function aggregateCities(passages: readonly ChapterFinderCityPassage[]): AggregatedCity[] {
  const cities = new Map<string, AggregatedCity>();

  passages.forEach((passage, passageOrder) => {
    const cityDocumentId = passage.city?.documentId;
    const cityName = passage.city?.name;
    if (!cityDocumentId || !cityName) {
      return;
    }

    const existing = cities.get(cityDocumentId);
    const validAliases = Array.isArray(passage.city.alternativeNames)
      ? passage.city.alternativeNames.filter(
          (alias): alias is string => typeof alias === 'string' && alias.trim().length > 0
        )
      : [];

    if (!existing) {
      cities.set(cityDocumentId, {
        documentId: cityDocumentId,
        name: cityName,
        alternativeNames: [...new Set(validAliases)],
        roles: [passage.role],
        passageOrder,
      });
      return;
    }

    for (const alias of validAliases) {
      if (!existing.alternativeNames.includes(alias)) {
        existing.alternativeNames.push(alias);
      }
    }

    if (!existing.roles.includes(passage.role)) {
      existing.roles.push(passage.role);
    }
  });

  return [...cities.values()];
}

export function searchChapters(
  chapters: readonly ChapterFinderItem[],
  query: string
): ChapterSearchResult[] {
  const normalizedQuery = normalizeChapterSearchText(query);

  if (!normalizedQuery) {
    return chapters
      .map((chapter, inputOrder) => ({ chapter, inputOrder }))
      .sort((itemA, itemB) => compareChapterOrder(
        itemA.chapter,
        itemB.chapter,
        itemA.inputOrder,
        itemB.inputOrder
      ))
      .map(({ chapter }) => createChapterResult(chapter));
  }

  const rankedResults: RankedResult[] = [];

  chapters.forEach((chapter, inputOrder) => {
    const matchingCities = aggregateCities(chapter.cityPassages).flatMap((city) => {
      const matchRank = getBestMatchRank(
        [city.name, ...city.alternativeNames],
        normalizedQuery
      );

      return matchRank === null ? [] : [{ city, matchRank }];
    });
    const identityMatchRank = getBestMatchRank([
      chapter.title,
      String(chapter.displayOrder),
      `Chapitre ${chapter.displayOrder}`,
    ], normalizedQuery);
    const stationMatchRank = getBestMatchRank([
      chapter.startStation,
      chapter.endStation,
    ], normalizedQuery);
    const chapterMatchRank = matchingCities.length > 0
      ? null
      : identityMatchRank === null
        ? stationMatchRank
        : stationMatchRank === null
          ? identityMatchRank
          : Math.min(identityMatchRank, stationMatchRank) as MatchRank;

    if (chapterMatchRank !== null) {
      rankedResults.push({
        result: createChapterResult(chapter),
        matchRank: chapterMatchRank,
        passageOrder: -1,
        inputOrder,
      });
    }

    for (const { city, matchRank } of matchingCities) {
      rankedResults.push({
        result: {
          kind: 'city',
          resultId: `city:${chapter.documentId}:${city.documentId}`,
          chapter,
          city: {
            documentId: city.documentId,
            name: city.name,
            roles: city.roles,
          },
        },
        matchRank,
        passageOrder: city.passageOrder,
        inputOrder,
      });
    }
  });

  return rankedResults
    .sort((itemA, itemB) => {
      if (itemA.matchRank !== itemB.matchRank) {
        return itemA.matchRank - itemB.matchRank;
      }

      const chapterOrder = compareChapterOrder(
        itemA.result.chapter,
        itemB.result.chapter,
        itemA.inputOrder,
        itemB.inputOrder
      );
      if (chapterOrder !== 0) {
        return chapterOrder;
      }

      if (itemA.passageOrder !== itemB.passageOrder) {
        return itemA.passageOrder - itemB.passageOrder;
      }

      return itemA.result.resultId.localeCompare(itemB.result.resultId, 'fr');
    })
    .map(({ result }) => result);
}
