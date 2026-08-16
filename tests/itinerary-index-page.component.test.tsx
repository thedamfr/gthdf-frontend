import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublicItinerary } from '../lib/itineraries/types';

const mocks = vi.hoisted(() => ({
  getPublicCatalogueEntries: vi.fn(),
}));

vi.mock('@/lib/itineraries/server', () => ({
  getPublicCatalogueEntries: mocks.getPublicCatalogueEntries,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import ItineraryIndexPage from '../app/itineraires-velo/page';

function itinerary(
  slug: string,
  departure: string,
  arrival: string,
  seoStatus: 'indexable' | 'noindex' = 'indexable'
): PublicItinerary {
  return {
    documentId: `document-${slug}`,
    slug,
    departure: { name: departure },
    arrival: { name: arrival },
    distanceMetres: 12_345,
    seoStatus,
    isPreview: false,
  } as PublicItinerary;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ItineraryIndexPage', () => {
  it('renders crawlable links for every indexable public itinerary', async () => {
    mocks.getPublicCatalogueEntries.mockResolvedValue([
      itinerary('le-touquet-a-camiers', 'Le Touquet-Paris-Plage', 'Camiers'),
      itinerary('arras-a-douai', 'Arras', 'Douai'),
      itinerary('route-privee', 'Amiens', 'Arras', 'noindex'),
    ]);

    render(await ItineraryIndexPage());

    expect(screen.getByText('2 itinéraires publiés')).toBeTruthy();
    const links = screen.getAllByRole('link').filter((link) => (
      link.getAttribute('href')?.startsWith('/itineraires-velo/')
    ));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/itineraires-velo/arras-a-douai',
      '/itineraires-velo/le-touquet-a-camiers',
    ]);
    expect(screen.getByText('Du Touquet-Paris-Plage à Camiers à vélo')).toBeTruthy();
    expect(screen.queryByText('De Le Touquet-Paris-Plage à Camiers à vélo')).toBeNull();
    expect(document.querySelector('a[href="/itineraires-velo/route-privee"]')).toBeNull();
  });
});
