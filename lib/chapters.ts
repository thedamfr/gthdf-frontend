import { cache } from 'react';

import {
  assignStableDisplayOrder,
  hasCompleteDisplayOrder,
  sortChaptersByDisplayOrder,
} from './chapter-order';
import type { CityPassage } from './city-content';
import { fetchAPI } from './strapi';

interface StrapiMedia {
  id?: number;
  url: string;
  documentId?: string;
  updatedAt?: string;
  hash?: string;
  size?: number;
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

export interface ChapterGpxSource {
  documentId: string;
  title: string;
  slug: string;
  displayOrder?: number | null;
  updatedAt?: string;
  gpxFileAB?: StrapiMedia;
  gpxFileBA?: StrapiMedia;
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

/** Get published chapters in stable display order with a transitional fallback. */
export const getChaptersInOrder = cache(async (): Promise<Chapter[]> => {
  const chapters = await fetchAPI<Chapter[]>({
    endpoint: '/chapters',
    query: {
      'fields[0]': 'documentId',
      'fields[1]': 'title',
      'fields[2]': 'slug',
      'fields[3]': 'startStation',
      'fields[4]': 'endStation',
      'fields[5]': 'distance',
      'fields[6]': 'introSentence',
      'fields[7]': 'displayOrder',
      'fields[8]': 'updatedAt',
      'fields[9]': 'publishedAt',
      'populate[thumbnail][fields][0]': 'url',
      'populate[thumbnail][fields][1]': 'name',
      'populate[thumbnail][fields][2]': 'alternativeText',
      'populate[cityPassages][fields][0]': 'role',
      'populate[cityPassages][fields][1]': 'featured',
      'populate[cityPassages][populate][city][fields][0]': 'documentId',
      'populate[cityPassages][populate][city][fields][1]': 'name',
      'populate[cityPassages][populate][city][fields][2]': 'alternativeNames',
      'populate[cityPassages][populate][city][fields][3]': 'publishedAt',
      'pagination[pageSize]': 100,
    },
    wrappedByList: true,
    revalidate: 300,
  });

  if (!hasCompleteDisplayOrder(chapters)) {
    console.error(
      'Published chapter displayOrder values are incomplete; using a deterministic fallback.'
    );
  }

  return sortChaptersByDisplayOrder(chapters);
});

/**
 * Published GPX metadata used only by the server-side proximity index.
 * Draft Mode must never expose draft traces through the public endpoint.
 */
export async function getPublishedChapterGpxSources(): Promise<ChapterGpxSource[]> {
  const chapters = await fetchAPI<ChapterGpxSource[]>({
    endpoint: '/chapters',
    query: {
      'fields[0]': 'documentId',
      'fields[1]': 'title',
      'fields[2]': 'slug',
      'fields[3]': 'displayOrder',
      'fields[4]': 'updatedAt',
      'populate[gpxFileAB][fields][0]': 'url',
      'populate[gpxFileAB][fields][1]': 'documentId',
      'populate[gpxFileAB][fields][2]': 'updatedAt',
      'populate[gpxFileAB][fields][3]': 'hash',
      'populate[gpxFileAB][fields][4]': 'size',
      'populate[gpxFileBA][fields][0]': 'url',
      'populate[gpxFileBA][fields][1]': 'documentId',
      'populate[gpxFileBA][fields][2]': 'updatedAt',
      'populate[gpxFileBA][fields][3]': 'hash',
      'populate[gpxFileBA][fields][4]': 'size',
      'pagination[pageSize]': 100,
    },
    wrappedByList: true,
    forcePublished: true,
    cacheMode: 'no-store',
  });

  if (!hasCompleteDisplayOrder(chapters)) {
    console.error(
      'Published GPX chapter displayOrder values are incomplete; using a deterministic fallback.'
    );
  }

  return assignStableDisplayOrder(chapters);
}

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
