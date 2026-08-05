import { cache } from 'react';

import type { CityPassage } from './city-content';
import { fetchAPI } from './strapi';

interface StrapiMedia {
  url: string;
  name?: string;
  alternativeText?: string;
}

interface HorizonCard {
  id: number;
  title: string;
  description: string;
  borderColor: 'bleu' | 'vert' | 'rouge' | 'jaune' | 'beige';
  image: StrapiMedia;
}

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  photo?: StrapiMedia;
  borderColor: 'bleu' | 'vert' | 'rouge' | 'jaune' | 'beige';
}

export interface ChapterCheckpoint {
  id: number;
  number: number;
  title?: string;
  enigma: string;
  hint?: string;
  what3words: string;
}

export interface RelatedArticle {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  description?: string;
  cover?: StrapiMedia;
}

export interface ChapterDestination {
  id: number;
  title: string;
  description?: string;
  pois: Array<{
    id: number;
    name: string;
    description: string;
    photo?: StrapiMedia;
    url?: string;
  }>;
}

export interface ChapterSeo {
  metaTitle?: string;
  metaDescription?: string;
  shareImage?: StrapiMedia;
}

export interface Chapter {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  startStation: string;
  endStation: string;
  distance: number;
  introSentence: string;
  updatedAt?: string;
  publishedAt?: string | null;
  displayOrder?: number | null;
  thumbnail?: StrapiMedia;
  komootEmbedAB?: string;
  komootEmbedBA?: string;
  gpxFileAB?: StrapiMedia;
  gpxFileBA?: StrapiMedia;
  horizons?: HorizonCard[];
  routeNotes?: string;
  testimonials?: Testimonial[];
  nextChapter?: Pick<Chapter, 'id' | 'slug' | 'title'>;
  previousChapter?: Pick<Chapter, 'id' | 'slug' | 'title'>;
  checkpoints?: ChapterCheckpoint[];
  relatedArticles?: RelatedArticle[];
  destination?: ChapterDestination;
  seo?: ChapterSeo;
  cities?: string[];
  cityPassages?: CityPassage[];
}

/**
 * Sort chapters by following the nextChapter chain.
 */
export function sortChaptersByChain(chapters: Chapter[]): Chapter[] {
  if (chapters.length === 0) return [];

  const chapterMap = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const referencedIds = new Set(
    chapters
      .filter((chapter) => chapter.nextChapter?.id)
      .map((chapter) => chapter.nextChapter!.id)
  );

  const first = chapters.find((chapter) => !referencedIds.has(chapter.id)) ?? chapters[0];
  const ordered: Chapter[] = [];
  const visited = new Set<number>();

  let current: Chapter | undefined = first;
  while (current && !visited.has(current.id)) {
    ordered.push(current);
    visited.add(current.id);
    current = current.nextChapter?.id
      ? chapterMap.get(current.nextChapter.id)
      : undefined;
  }

  chapters.forEach((chapter) => {
    if (!visited.has(chapter.id)) ordered.push(chapter);
  });

  return ordered;
}

/**
 * Get all published chapters with only list/static-generation fields.
 */
export const getChapters = cache(async (): Promise<Chapter[]> => {
  try {
    return await fetchAPI<Chapter[]>({
      endpoint: '/chapters',
      query: {
        'fields[0]': 'id',
        'fields[1]': 'documentId',
        'fields[2]': 'title',
        'fields[3]': 'slug',
        'fields[4]': 'startStation',
        'fields[5]': 'endStation',
        'fields[6]': 'distance',
        'fields[7]': 'updatedAt',
        'populate[0]': 'thumbnail',
      },
      wrappedByList: true,
      revalidate: 300,
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
});

/**
 * Get chapters in sequential order following the nextChapter chain.
 */
export const getChaptersInOrder = cache(async (): Promise<Chapter[]> => {
  try {
    const chapters = await fetchAPI<Chapter[]>({
      endpoint: '/chapters',
      query: {
        'populate[0]': 'nextChapter',
        'populate[1]': 'thumbnail',
      },
      wrappedByList: true,
      revalidate: 300,
    });

    return sortChaptersByChain(chapters);
  } catch (error) {
    console.error('Error fetching chapters in order:', error);
    return [];
  }
});

/**
 * Get a single chapter by slug, including ordered city passages in one request.
 */
export const getChapterBySlug = cache(async (slug: string): Promise<Chapter | null> => {
  const chapters = await fetchAPI<Chapter[]>({
    endpoint: '/chapters',
    query: {
      'filters[slug][$eq]': slug,
      'populate[0]': 'horizons.image',
      'populate[1]': 'gpxFileAB',
      'populate[2]': 'gpxFileBA',
      'populate[3]': 'testimonials.photo',
      'populate[4]': 'nextChapter',
      'populate[5]': 'previousChapter',
      'populate[6]': 'thumbnail',
      'populate[7]': 'seo',
      'populate[8]': 'seo.shareImage',
      'populate[9]': 'destination',
      'populate[10]': 'destination.pois',
      'populate[11]': 'destination.pois.photo',
      'populate[12]': 'checkpoints',
      'populate[13]': 'relatedArticles',
      'populate[14]': 'relatedArticles.cover',
      'populate[15]': 'cityPassages.city',
    },
    wrappedByList: true,
    revalidate: 300,
  });

  return chapters[0] ?? null;
});
