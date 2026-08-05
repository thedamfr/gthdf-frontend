import { cache } from 'react';

import type { CityPassage } from './city-content';
import {
  filterEligibleCityReferences,
  sortCityChapters,
} from './city-content';
import { fetchAPI } from './strapi';

export interface CityMedia {
  url: string;
  alternativeText?: string | null;
  width?: number;
  height?: number;
}

export type CityBlock =
  | {
      __component: 'shared.rich-text';
      id: number;
      body?: string;
    }
  | {
      __component: 'shared.media';
      id: number;
      file?: CityMedia;
    }
  | {
      __component: 'shared.quote';
      id: number;
      title?: string;
      body?: string;
    }
  | {
      __component: 'shared.slider';
      id: number;
      files?: CityMedia[];
    };

export interface City {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  alternativeNames?: string[];
  municipalityKey?: string;
  countryCode?: string;
  municipalityCode?: string;
  administrativeArea?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  shortDescription?: string;
  blocks?: CityBlock[];
  hasPublicPage: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    shareImage?: CityMedia;
  };
  updatedAt: string;
  publishedAt?: string | null;
}

export interface CityChapter {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  startStation: string;
  endStation: string;
  distance: number;
  displayOrder?: number | null;
  cityPassages: CityPassage[];
}

export interface PublicCityReference {
  documentId: string;
  slug: string;
  updatedAt: string;
}

export const getCityBySlug = cache(async (slug: string): Promise<City | null> => {
  const cities = await fetchAPI<City[]>({
    endpoint: '/cities',
    query: {
      'filters[slug][$eq]': slug,
      'fields[0]': 'documentId',
      'fields[1]': 'name',
      'fields[2]': 'slug',
      'fields[3]': 'alternativeNames',
      'fields[4]': 'municipalityKey',
      'fields[5]': 'countryCode',
      'fields[6]': 'municipalityCode',
      'fields[7]': 'administrativeArea',
      'fields[8]': 'latitude',
      'fields[9]': 'longitude',
      'fields[10]': 'shortDescription',
      'fields[11]': 'hasPublicPage',
      'fields[12]': 'updatedAt',
      'fields[13]': 'publishedAt',
      'populate[0]': 'blocks',
      'populate[1]': 'blocks.file',
      'populate[2]': 'blocks.files',
      'populate[3]': 'seo',
      'populate[4]': 'seo.shareImage',
    },
    wrappedByList: true,
    revalidate: 300,
  });

  return cities[0] ?? null;
});

export const getChaptersForCity = cache(async (documentId: string): Promise<CityChapter[]> => {
  const chapters = await fetchAPI<CityChapter[]>({
    endpoint: '/chapters',
    query: {
      'filters[cityPassages][city][documentId][$eq]': documentId,
      'fields[0]': 'documentId',
      'fields[1]': 'title',
      'fields[2]': 'slug',
      'fields[3]': 'startStation',
      'fields[4]': 'endStation',
      'fields[5]': 'distance',
      'populate[0]': 'cityPassages.city',
    },
    wrappedByList: true,
    revalidate: 300,
  });

  return sortCityChapters(chapters);
});

const getPublicCityCandidates = cache(async (): Promise<PublicCityReference[]> => {
  return fetchAPI<PublicCityReference[]>({
    endpoint: '/cities',
    query: {
      'filters[hasPublicPage][$eq]': true,
      'fields[0]': 'documentId',
      'fields[1]': 'slug',
      'fields[2]': 'updatedAt',
      'pagination[pageSize]': 1000,
    },
    wrappedByList: true,
    revalidate: 3600,
  });
});

const getReferencedCityDocumentIds = cache(async (): Promise<Set<string>> => {
  const chapters = await fetchAPI<Array<{ cityPassages?: CityPassage[] }>>({
    endpoint: '/chapters',
    query: {
      'fields[0]': 'documentId',
      'populate[0]': 'cityPassages.city',
      'pagination[pageSize]': 1000,
    },
    wrappedByList: true,
    revalidate: 3600,
  });

  return new Set(
    chapters.flatMap((chapter) =>
      (chapter.cityPassages ?? [])
        .map((passage) => passage.city?.documentId)
        .filter((documentId): documentId is string => Boolean(documentId))
    )
  );
});

export const getEligiblePublicCities = cache(async (): Promise<PublicCityReference[]> => {
  const [cities, referencedCityDocumentIds] = await Promise.all([
    getPublicCityCandidates(),
    getReferencedCityDocumentIds(),
  ]);

  return filterEligibleCityReferences(cities, referencedCityDocumentIds);
});
