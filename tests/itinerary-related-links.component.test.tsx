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

import ItineraryPage, {
  generateMetadata,
} from '../app/itineraires-velo/[slug]/page';

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
  it('lets an editor leave preview mode and return to the public itinerary', async () => {
    const current = verifiedItineraryFixture().guarded;
    current.dto.isPreview = true;
    mocks.resolveCatalogueItinerary.mockResolvedValue({ kind: 'found', itinerary: current });

    render(await ItineraryPage({
      params: Promise.resolve({ slug: current.dto.slug }),
    }));

    expect(screen.getByRole('status').textContent).toContain('Mode prévisualisation actif');
    expect(screen.getByRole('link', {
      name: 'Quitter la prévisualisation',
    }).getAttribute('href')).toBe(
      `/api/preview/exit?url=${encodeURIComponent(`/itineraires-velo/${current.dto.slug}`)}`
    );
  });

  it('generates intent-led metadata from the verified GPX distance', async () => {
    const current = verifiedItineraryFixture().guarded;
    current.dto.departure = {
      ...current.dto.departure,
      name: 'Le Touquet-Paris-Plage',
    };
    current.dto.arrival = {
      ...current.dto.arrival,
      name: 'Camiers',
    };
    current.dto.distanceMetres = 7_530.71;
    current.dto.seo.metaTitle = 'Ancien titre éditorial';
    current.dto.seo.metaDescription = 'Ancienne description éditoriale';
    mocks.resolveCatalogueItinerary.mockResolvedValue({ kind: 'found', itinerary: current });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: current.dto.slug }),
    });

    expect(metadata.title).toBe(
      'Le Touquet-Paris-Plage – Camiers à vélo : itinéraire GPX de 7,5 km'
    );
    expect(metadata.description).toBe(
      'L’itinéraire cyclotouristique du Touquet-Paris-Plage à Camiers fait 7,5 km sur une portion du Grand Tour des Hauts-de-France. Carte, dénivelé et GPX.'
    );
    expect(metadata.openGraph).toMatchObject({
      title: metadata.title,
      description: metadata.description,
    });
  });

  it('does not promise elevation data in metadata when it is unavailable', async () => {
    const current = verifiedItineraryFixture().guarded;
    current.dto.elevationAvailable = false;
    current.dto.elevationGainMetres = null;
    current.dto.elevationLossMetres = null;
    mocks.resolveCatalogueItinerary.mockResolvedValue({ kind: 'found', itinerary: current });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: current.dto.slug }),
    });

    expect(metadata.description).toMatch(/Carte et GPX\.$/);
    expect(metadata.description).not.toContain('dénivelé');
  });

  it('answers the cycling-distance intent with one GPX distance and factual copy', async () => {
    const current = verifiedItineraryFixture().guarded;
    current.dto.title = 'Le Touquet-Paris-Plage – Camiers à vélo';
    current.dto.departure = {
      ...current.dto.departure,
      name: 'Le Touquet-Paris-Plage',
    };
    current.dto.arrival = {
      ...current.dto.arrival,
      name: 'Camiers',
    };
    current.dto.distanceMetres = 7_530.71;
    mocks.resolveCatalogueItinerary.mockResolvedValue({ kind: 'found', itinerary: current });
    mocks.getRelatedDepartureItineraries.mockResolvedValue([]);

    const view = render(await ItineraryPage({
      params: Promise.resolve({ slug: current.dto.slug }),
    }));

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Du Touquet-Paris-Plage à Camiers à vélo : 7,5 km',
    })).toBeTruthy();
    expect(screen.getByText(
      'L’itinéraire cyclotouristique du Touquet-Paris-Plage à Camiers fait 7,5 km. Cette distance est mesurée le long du tracé GPX téléchargeable ci-dessous.'
    )).toBeTruthy();
    expect(screen.getByText(/une boucle cyclotouristique de 1 400 km/)).toBeTruthy();
    expect(screen.getByText('Distance du tracé GPX')).toBeTruthy();
    expect(screen.getByRole('link', {
      name: 'Télécharger le GPX du Touquet-Paris-Plage à Camiers — 7,5 km',
    })).toBeTruthy();
    expect(view.queryByText('Distance à vol d’oiseau')).toBeNull();
    expect(view.container.textContent).not.toContain('familles');
    expect(view.queryByText(current.dto.title)).toBeNull();
  });

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
      current.departure.documentId,
      current.documentId
    );
  });
});
