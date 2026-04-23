import { cache } from 'react';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface Chapter {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  startStation: string;
  endStation: string;
  distance: number;
  introSentence: string;
  updatedAt?: string;
  thumbnail?: { url: string; alternativeText?: string };
  komootEmbedAB?: string;
  komootEmbedBA?: string;
  gpxFileAB?: { url: string; name: string };
  gpxFileBA?: { url: string; name: string };
  horizons?: any[];
  routeNotes?: string;
  testimonials?: Array<{
    id: number;
    quote: string;
    author: string;
    photo?: { url: string; alternativeText?: string };
    borderColor: 'bleu' | 'vert' | 'rouge' | 'jaune' | 'beige';
  }>;
  nextChapter?: { id: number; slug: string; title: string };
  previousChapter?: { id: number; slug: string; title: string };
}

/**
 * Sort chapters by following the nextChapter chain
 */
export function sortChaptersByChain(chapters: Chapter[]): Chapter[] {
  if (chapters.length === 0) return [];

  const chapterMap = new Map(chapters.map((ch) => [ch.id, ch]));
  const referencedIds = new Set(
    chapters.filter((ch) => ch.nextChapter?.id).map((ch) => ch.nextChapter!.id)
  );

  let first = chapters.find((ch) => !referencedIds.has(ch.id)) ?? chapters[0];

  const ordered: Chapter[] = [];
  const visited = new Set<number>();

  let current: Chapter | undefined = first;
  while (current && !visited.has(current.id)) {
    ordered.push(current);
    visited.add(current.id);
    current = current.nextChapter?.id ? chapterMap.get(current.nextChapter.id) : undefined;
  }

  chapters.forEach((ch) => {
    if (!visited.has(ch.id)) ordered.push(ch);
  });

  return ordered;
}

/**
 * Get all chapters (minimal fields for generateStaticParams)
 */
export const getChapters = cache(async (): Promise<Chapter[]> => {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/chapters?fields[0]=id&fields[1]=title&fields[2]=slug&fields[3]=startStation&fields[4]=endStation&fields[5]=distance&populate[0]=thumbnail`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch chapters');
      return [];
    }

    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
});

/**
 * Get chapters in sequential order following the nextChapter chain
 */
export const getChaptersInOrder = cache(async (): Promise<Chapter[]> => {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/chapters?populate[0]=nextChapter&populate[1]=thumbnail`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch chapters');
      return [];
    }

    const json = await response.json();
    return sortChaptersByChain(json.data || []);
  } catch (error) {
    console.error('Error fetching chapters in order:', error);
    return [];
  }
})

/**
 * Get a single chapter by slug
 */
export const getChapterBySlug = cache(async (slug: string): Promise<Chapter | null> => {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/chapters?filters[slug][$eq]=${slug}&populate[0]=horizons.image&populate[1]=gpxFileAB&populate[2]=gpxFileBA&populate[3]=testimonials.photo&populate[4]=nextChapter&populate[5]=previousChapter&populate[6]=thumbnail`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch chapter');
      return null;
    }

    const json = await response.json();
    return json.data?.[0] || null;
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return null;
  }
});
