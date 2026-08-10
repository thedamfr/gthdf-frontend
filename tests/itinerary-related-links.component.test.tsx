import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicItinerary } from '../lib/itineraries/types';
import { verifiedItineraryFixture } from './itinerary-fixtures';

const mocks = vi.hoisted(() => ({
  getRelatedDepartureItineraries: vi.fn(),
  resolveCatalogueItinerary: vi.fn(),
}));

vi.mock('next/headers', () => ({
  draftMode: vi.fn().mockResolvedValue({ isEnabled: false }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('not_found'); },
  permanentRedirect: (href: string) => { throw new Error(`redirect:${href}`); },
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
vi.mock('@/components/itineraries/DeferredRouteVisualizations', () => ({
  default: () => <div data-testid="route-visualizations" />,
}));
vi.mock('@/lib/itineraries/map', () => ({
  isItineraryBasemapEnabled: () => false,
}));
vi.mock('@/lib/itineraries/server', () => ({
  getPublicCatalogueEntries: vi.fn(),
  getRelatedDepartureItineraries: mocks.getRelatedDepartureItineraries,
  resolveCatalogueItinerary: mocks.resolveCatalogueItinerary,
}));

import ItineraryPage from '../app/itineraires-velo/[slug]/page';

function relatedItinerary(
  current: PublicItinerary,
  index: number
): PublicItinerary {
  return {
    ...current,
    documentId: `related-${index}`,
    slug: `calais-destination-${index}`,
    title: `Calais – Destination ${index}`,
    arrival: {
      documentId: `city-destination-${index}`,
      name: `Destination ${index}`,
    },
    distanceMetres: index * 10_000,
  };
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  const current = verifiedItineraryFixture().guarded;
  mocks.resolveCatalogueItinerary.mockResolvedValue({ kind: 'found', itinerary: current });
  mocks.getRelatedDepartureItineraries.mockResolvedValue(
    [1, 2, 3].map((index) => relatedItinerary(current.dto, index))
  );
});

describe('ItineraryPage related links', () => {
  it('renders three crawlable alternatives with the same departure in the initial HTML', async () => {
    const current = verifiedItineraryFixture().guarded.dto;
    render(await ItineraryPage({ params: Promise.resolve({ slug: current.slug }) }));

    const section = screen.getByRole('region', { name: 'Voir aussi au départ de Calais' });
    const links = within(section).getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/itineraires-velo/calais-destination-1',
      '/itineraires-velo/calais-destination-2',
      '/itineraires-velo/calais-destination-3',
    ]);
    expect(mocks.getRelatedDepartureItineraries).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: current.documentId })
    );
  });
});
