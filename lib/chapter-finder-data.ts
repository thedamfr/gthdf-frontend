import {
  hasCompleteDisplayOrder,
  sortChaptersByDisplayOrder,
} from './chapter-order.ts';
import type {
  ChapterFinderCityPassage,
  ChapterFinderCityRole,
  ChapterFinderItem,
} from './chapter-search.ts';

type FinderCityInput = {
  documentId?: unknown;
  name?: unknown;
  alternativeNames?: unknown;
  publishedAt?: unknown;
};

type FinderPassageInput = {
  role?: unknown;
  city?: FinderCityInput | null;
};

export interface ChapterFinderInput {
  documentId: string;
  slug: string;
  displayOrder?: number | null;
  title: string;
  startStation: string;
  endStation: string;
  distance: number;
  cityPassages?: readonly FinderPassageInput[];
}

function isCityRole(value: unknown): value is ChapterFinderCityRole {
  return value === 'start' || value === 'intermediate' || value === 'end';
}

function toPublishedPassage(passage: FinderPassageInput): ChapterFinderCityPassage | null {
  const { city } = passage;

  if (
    !isCityRole(passage.role)
    || !city
    || typeof city.documentId !== 'string'
    || !city.documentId
    || typeof city.name !== 'string'
    || !city.name.trim()
    || typeof city.publishedAt !== 'string'
    || !city.publishedAt
  ) {
    return null;
  }

  const alternativeNames = Array.isArray(city.alternativeNames)
    ? city.alternativeNames.filter(
        (name): name is string => typeof name === 'string' && name.trim().length > 0
      )
    : [];

  return {
    role: passage.role,
    city: {
      documentId: city.documentId,
      name: city.name.trim(),
      ...(alternativeNames.length > 0 ? { alternativeNames } : {}),
    },
  };
}

export function buildChapterFinderItems(
  chapters: readonly ChapterFinderInput[]
): ChapterFinderItem[] {
  const orderedChapters = sortChaptersByDisplayOrder([...chapters]);
  const preserveDisplayOrder = hasCompleteDisplayOrder([...chapters]);

  return orderedChapters.map((chapter, index) => {
    const cityPassages = (chapter.cityPassages ?? [])
      .map(toPublishedPassage)
      .filter((passage): passage is ChapterFinderCityPassage => passage !== null);
    const startName = cityPassages.find((passage) => passage.role === 'start')?.city.name
      ?? chapter.startStation;
    const endName = cityPassages.find((passage) => passage.role === 'end')?.city.name
      ?? chapter.endStation;

    return {
      documentId: chapter.documentId,
      slug: chapter.slug,
      displayOrder: preserveDisplayOrder ? chapter.displayOrder as number : index + 1,
      title: chapter.title,
      startName,
      endName,
      startStation: chapter.startStation,
      endStation: chapter.endStation,
      distance: chapter.distance,
      cityPassages,
    };
  });
}
