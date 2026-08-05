import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

import ChapterFinder from '../components/ChapterFinder';
import type { ChapterFinderItem } from '../lib/chapter-search';
import type { ProximityIndex } from '../lib/proximity-types';

const chapters: ChapterFinderItem[] = [
  {
    documentId: 'chapter-lille-arras',
    slug: 'lille-arras',
    displayOrder: 1,
    title: 'De la métropole aux places d’Arras',
    startName: 'Lille',
    endName: 'Arras',
    startStation: 'Lille Flandres',
    endStation: 'Gare d’Arras',
    distance: 125,
    cityPassages: [
      {
        role: 'start',
        city: {
          documentId: 'city-lille',
          name: 'Lille',
        },
      },
      {
        role: 'end',
        city: {
          documentId: 'city-arras',
          name: 'Arras',
          alternativeNames: ['Atrecht'],
        },
      },
    ],
  },
  {
    documentId: 'chapter-arras-conde',
    slug: 'arras-conde-sur-escaut',
    displayOrder: 2,
    title: 'Du bassin minier à l’Escaut',
    startName: 'Arras',
    endName: 'Condé-sur-l’Escaut',
    startStation: 'Gare d’Arras',
    endStation: 'Gare de Condé-sur-l’Escaut',
    distance: 138,
    cityPassages: [],
  },
];

const proximityIndex: ProximityIndex = {
  schemaVersion: 1,
  revision: 'test-revision',
  partial: false,
  chapters: [
    {
      documentId: 'chapter-lille-arras',
      slug: 'lille-arras',
      displayOrder: 1,
      boundingBox: [3.05, 50.62, 3.08, 50.65],
      traces: [
        {
          direction: 'AB',
          boundingBox: [3.05, 50.62, 3.08, 50.65],
          segments: [[[3.06, 50.63], [3.07, 50.64]]],
        },
      ],
    },
  ],
};

type GeolocationMocks = {
  getCurrentPosition: Mock;
  watchPosition: Mock;
};

function installGeolocation(): GeolocationMocks {
  const getCurrentPosition = vi.fn();
  const watchPosition = vi.fn();

  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition,
      watchPosition,
      clearWatch: vi.fn(),
    },
  });

  return { getCurrentPosition, watchPosition };
}

function position(latitude = 50.63, longitude = 3.06, accuracy = 20): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: 1,
    toJSON: () => ({}),
  };
}

function geolocationError(code: number): GeolocationPositionError {
  return {
    code,
    message: 'test error',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

function successfulIndexResponse(index: ProximityIndex = proximityIndex) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(index),
  };
}

describe('ChapterFinder', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window.navigator, 'geolocation');
    Reflect.deleteProperty(window, 'isSecureContext');
  });

  it('renders the complete server list in an idle finder before hydration', () => {
    const markup = renderToStaticMarkup(<ChapterFinder chapters={chapters} />);
    const container = document.createElement('div');
    container.innerHTML = markup;

    const finder = container.querySelector('section[aria-labelledby="chapter-finder-title"]');
    const chapterLinks = container.querySelectorAll('a[href^="/chapitres/"]');
    const locationButton = container.querySelector('button');

    expect(finder?.getAttribute('data-search-state')).toBe('idle');
    expect(chapterLinks).toHaveLength(2);
    expect(locationButton?.textContent).toBe('Autour de moi');
    expect((locationButton as HTMLButtonElement).disabled).toBe(true);
    expect(markup).toContain('Tous les chapitres restent accessibles dans la liste ci-dessous.');
  });

  it('does not acquire a position or request the index before an explicit click', async () => {
    const { getCurrentPosition, watchPosition } = installGeolocation();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const view = render(<ChapterFinder chapters={chapters} />);
    const locationButton = view.getByRole('button', { name: 'Autour de moi' }) as HTMLButtonElement;

    await waitFor(() => expect(locationButton.disabled).toBe(false));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('acquires one punctual position with the PRD options and never watches it', async () => {
    const { getCurrentPosition, watchPosition } = installGeolocation();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const view = render(<ChapterFinder chapters={chapters} />);
    const locationButton = view.getByRole('button', { name: 'Autour de moi' }) as HTMLButtonElement;
    await waitFor(() => expect(locationButton.disabled).toBe(false));

    fireEvent.click(locationButton);

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    });
    expect(watchPosition).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests the fixed same-origin index only after a successful position', async () => {
    const { getCurrentPosition, watchPosition } = installGeolocation();
    const fetchMock = vi.fn().mockResolvedValue(successfulIndexResponse());
    vi.stubGlobal('fetch', fetchMock);

    const view = render(<ChapterFinder chapters={chapters} />);
    const locationButton = view.getByRole('button', { name: 'Autour de moi' }) as HTMLButtonElement;
    await waitFor(() => expect(locationButton.disabled).toBe(false));
    fireEvent.click(locationButton);

    expect(fetchMock).not.toHaveBeenCalled();
    const success = getCurrentPosition.mock.calls[0]?.[0] as PositionCallback;
    await act(async () => {
      success(position());
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/chapters/proximity-index', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(watchPosition).not.toHaveBeenCalled();
    await view.findByText('Vous êtes près de ce chapitre.');
  });

  it('reclassifies an ambiguous index response as one result after joining current chapters', async () => {
    const { getCurrentPosition } = installGeolocation();
    const indexWithRemovedChapter: ProximityIndex = {
      ...proximityIndex,
      chapters: [
        {
          documentId: 'chapter-removed',
          slug: 'chapter-removed',
          displayOrder: 0,
          boundingBox: [3.05, 50.62, 3.08, 50.65],
          traces: [{
            direction: 'AB',
            boundingBox: [3.05, 50.62, 3.08, 50.65],
            segments: [[[3.06, 50.63], [3.07, 50.64]]],
          }],
        },
        proximityIndex.chapters[0],
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(successfulIndexResponse(indexWithRemovedChapter))
    );

    const view = render(<ChapterFinder chapters={chapters} />);
    const locationButton = view.getByRole('button', { name: 'Autour de moi' }) as HTMLButtonElement;
    await waitFor(() => expect(locationButton.disabled).toBe(false));
    fireEvent.click(locationButton);

    const success = getCurrentPosition.mock.calls[0]?.[0] as PositionCallback;
    await act(async () => {
      success(position());
    });

    await view.findByText('Vous êtes près de ce chapitre.');
    expect(view.queryByText('Chapitres les plus proches de votre position :')).toBeNull();
    const proximityHeading = view.getByText('Vous êtes près de ce chapitre.');
    expect(proximityHeading.parentElement?.querySelectorAll('li')).toHaveLength(1);
  });

  it('reports an unavailable current result when every indexed chapter was removed', async () => {
    const { getCurrentPosition } = installGeolocation();
    const removedOnlyIndex: ProximityIndex = {
      ...proximityIndex,
      chapters: [{
        documentId: 'chapter-removed',
        slug: 'chapter-removed',
        displayOrder: 0,
        boundingBox: [3.05, 50.62, 3.08, 50.65],
        traces: [{
          direction: 'AB',
          boundingBox: [3.05, 50.62, 3.08, 50.65],
          segments: [[[3.06, 50.63], [3.07, 50.64]]],
        }],
      }],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(successfulIndexResponse(removedOnlyIndex))
    );

    const view = render(<ChapterFinder chapters={chapters} />);
    const locationButton = view.getByRole('button', { name: 'Autour de moi' }) as HTMLButtonElement;
    await waitFor(() => expect(locationButton.disabled).toBe(false));
    fireEvent.click(locationButton);

    const success = getCurrentPosition.mock.calls[0]?.[0] as PositionCallback;
    await act(async () => {
      success(position());
    });

    await view.findByText(
      'L’index géographique ne correspond plus à la liste actuelle. Recherchez une ville.'
    );
    expect(view.queryByText('Vous êtes près de ce chapitre.')).toBeNull();
    expect(view.queryByText('Chapitres les plus proches de votre position :')).toBeNull();
  });

  it('keeps the short live announcement separate from the interactive proximity list', async () => {
    const { getCurrentPosition } = installGeolocation();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(successfulIndexResponse()));

    const view = render(<ChapterFinder chapters={chapters} />);
    const locationButton = view.getByRole('button', { name: 'Autour de moi' }) as HTMLButtonElement;
    await waitFor(() => expect(locationButton.disabled).toBe(false));
    fireEvent.click(locationButton);

    const success = getCurrentPosition.mock.calls[0]?.[0] as PositionCallback;
    await act(async () => {
      success(position());
    });

    await view.findByText('Vous êtes près de ce chapitre.');
    const liveRegion = [...view.container.querySelectorAll('[role="status"][aria-live="polite"]')]
      .find((element) => element.textContent === 'Un chapitre proche a été trouvé.');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.querySelector('a, ul')).toBeNull();

    const proximityHeading = view.getByText('Vous êtes près de ce chapitre.');
    const proximityLink = proximityHeading.parentElement?.querySelector('a');
    expect(proximityLink).toBeTruthy();
    expect(proximityLink?.closest('[role="status"]')).toBeNull();
  });

  it.each([
    [1, 'La localisation a été refusée.'],
    [3, 'La localisation a pris trop de temps.'],
    [2, 'Votre position n’est pas disponible.'],
  ])('keeps the chapter list after geolocation error code %s', async (code, message) => {
    const { getCurrentPosition, watchPosition } = installGeolocation();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    getCurrentPosition.mockImplementation((
      _success: PositionCallback,
      failure: PositionErrorCallback
    ) => failure(geolocationError(code)));

    const view = render(<ChapterFinder chapters={chapters} />);
    const locationButton = view.getByRole('button', { name: 'Autour de moi' }) as HTMLButtonElement;
    await waitFor(() => expect(locationButton.disabled).toBe(false));
    fireEvent.click(locationButton);

    await view.findByText((content) => content.startsWith(message));
    expect(view.container.querySelectorAll('a[href^="/chapitres/"]')).toHaveLength(2);
    expect(view.getByRole('button', { name: 'Réessayer autour de moi' })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('filters locally by alias, displays the canonical city and restores the list with Escape', async () => {
    installGeolocation();
    vi.stubGlobal('fetch', vi.fn());

    const view = render(<ChapterFinder chapters={chapters} />);
    const searchInput = view.getByRole('searchbox', { name: 'Ville ou chapitre' }) as HTMLInputElement;
    const finder = view.container.querySelector('section[aria-labelledby="chapter-finder-title"]');

    expect(finder?.getAttribute('data-search-state')).toBe('idle');

    fireEvent.change(searchInput, { target: { value: 'Atrecht' } });

    expect(finder?.getAttribute('data-search-state')).toBe('results');
    expect(view.getByText('1 résultat')).toBeTruthy();
    expect(view.getByText('Arras · arrivée')).toBeTruthy();
    expect(view.container.querySelectorAll('a[href^="/chapitres/"]')).toHaveLength(1);

    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(searchInput.value).toBe('');
    expect(finder?.getAttribute('data-search-state')).toBe('idle');
    expect(view.container.querySelectorAll('a[href^="/chapitres/"]')).toHaveLength(2);
  });
});
