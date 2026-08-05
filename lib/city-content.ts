export type CityRole = 'start' | 'intermediate' | 'end';

export interface CityReference {
  documentId?: string;
  name: string;
  slug?: string;
  hasPublicPage?: boolean;
  publishedAt?: string | null;
}

export interface CityPassage {
  id?: number;
  role: CityRole;
  featured: boolean;
  note?: string | null;
  city: CityReference;
}

export interface CitySummary {
  start: CityPassage;
  end: CityPassage;
  featuredIntermediates: CityPassage[];
}

export function hasPublicCityPage(city: CityReference): boolean {
  return Boolean(city.slug && city.hasPublicPage && city.publishedAt);
}

export function getCityRoleLabel(role: CityRole): string {
  const labels: Record<CityRole, string> = {
    start: 'Départ du chapitre',
    intermediate: 'Passage intermédiaire',
    end: 'Arrivée du chapitre',
  };

  return labels[role];
}

type SortableCityChapter = {
  title: string;
  slug: string;
  displayOrder?: number | null;
};

export function sortCityChapters<T extends SortableCityChapter>(chapters: T[]): T[] {
  return [...chapters].sort((chapterA, chapterB) => {
    const orderA = typeof chapterA.displayOrder === 'number'
      ? chapterA.displayOrder
      : Number.POSITIVE_INFINITY;
    const orderB = typeof chapterB.displayOrder === 'number'
      ? chapterB.displayOrder
      : Number.POSITIVE_INFINITY;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const titleComparison = chapterA.title.localeCompare(chapterB.title, 'fr', {
      sensitivity: 'base',
    });

    return titleComparison || chapterA.slug.localeCompare(chapterB.slug, 'fr');
  });
}

export function filterEligibleCityReferences<T extends { documentId: string }>(
  cities: T[],
  referencedCityDocumentIds: Set<string>
): T[] {
  return cities.filter((city) => referencedCityDocumentIds.has(city.documentId));
}

export function formatFrenchList(values: string[]): string {
  if (values.length < 2) {
    return values[0] ?? '';
  }

  return `${values.slice(0, -1).join(', ')} et ${values[values.length - 1]}`;
}

export function getCitySummary(passages: CityPassage[]): CitySummary | null {
  const start = passages.find((passage) => passage.role === 'start');
  const end = passages.find((passage) => passage.role === 'end');

  if (!start || !end) {
    return null;
  }

  return {
    start,
    end,
    featuredIntermediates: passages.filter(
      (passage) => passage.role === 'intermediate' && passage.featured
    ),
  };
}

export function formatCitySummaryText(passages: CityPassage[]): string | null {
  const summary = getCitySummary(passages);

  if (!summary) {
    return null;
  }

  const baseText = `Ce chapitre relie ${summary.start.city.name} à ${summary.end.city.name}`;
  if (summary.featuredIntermediates.length === 0) {
    return `${baseText}.`;
  }

  const intermediateNames = summary.featuredIntermediates.map((passage) => passage.city.name);
  return `${baseText} en passant notamment par ${formatFrenchList(intermediateNames)}.`;
}
