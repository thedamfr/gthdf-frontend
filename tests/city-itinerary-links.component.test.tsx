import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicItinerary } from '../lib/itineraries/types';

const mocks = vi.hoisted(() => ({
  getChaptersForCity: vi.fn(),
  getCityBySlug: vi.fn(),
  getCityPageItineraries: vi.fn(),
}));

vi.mock('next/headers', () => ({
  draftMode: vi.fn().mockResolvedValue({ isEnabled: false }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('not_found'); },
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('@/components/CityBlocks', () => ({
  default: () => <div data-testid="city-blocks" />,
}));
vi.mock('@/lib/cities', () => ({
  getCityBySlug: mocks.getCityBySlug,
  getChaptersForCity: mocks.getChaptersForCity,
  getEligiblePublicCities: vi.fn(),
}));
vi.mock('@/lib/itineraries/server', () => ({
  getCityPageItineraries: mocks.getCityPageItineraries,
}));

import CityPage from '../app/villes/[slug]/page';

function itinerary(index: number): PublicItinerary {
  return {
    documentId: `itinerary-${index}`,
    slug: `calais-destination-${index}`,
    departure: {
      documentId: 'city-calais',
      name: index === 1 ? 'Le Touquet-Paris-Plage' : 'Calais',
    },
    arrival: {
      documentId: `city-${index}`,
      name: index === 1 ? 'Camiers' : `Destination ${index}`,
    },
    distanceMetres: index === 1 ? 7_500 : index * 10_000,
  } as PublicItinerary;
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCityBySlug.mockResolvedValue({
    id: 1,
    documentId: 'city-calais',
    name: 'Calais',
    slug: 'calais',
    hasPublicPage: true,
    blocks: [],
    updatedAt: '2026-08-10T06:00:00.000Z',
    publishedAt: '2026-08-10T06:00:00.000Z',
  });
  mocks.getChaptersForCity.mockResolvedValue([{
    id: 1,
    documentId: 'chapter-1',
    title: 'Calais à Boulogne-sur-Mer',
    slug: 'calais-boulogne-sur-mer',
    startStation: 'Calais',
    endStation: 'Boulogne-sur-Mer',
    distance: 95,
    cityPassages: [{
      role: 'start',
      featured: false,
      city: { documentId: 'city-calais', name: 'Calais' },
    }],
  }]);
  mocks.getCityPageItineraries.mockResolvedValue([1, 2, 3, 4, 5].map(itinerary));
});

describe('CityPage itinerary links', () => {
  it('renders five crawlable itinerary links in the initial city HTML', async () => {
    render(await CityPage({ params: Promise.resolve({ slug: 'calais' }) }));

    const section = screen.getByRole('region', { name: 'Itinéraires à vélo' });
    const links = within(section).getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/itineraires-velo/calais-destination-1',
      '/itineraires-velo/calais-destination-2',
      '/itineraires-velo/calais-destination-3',
      '/itineraires-velo/calais-destination-4',
      '/itineraires-velo/calais-destination-5',
    ]);
    expect(within(section).getByText('Du Touquet-Paris-Plage à Camiers')).toBeTruthy();
    expect(within(section).getByText('7,5 km sur le GTHF')).toBeTruthy();
    expect(mocks.getCityPageItineraries).toHaveBeenCalledWith('city-calais');
  });
});
