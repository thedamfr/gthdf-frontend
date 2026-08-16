import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import DeferredRouteVisualizations from '../components/itineraries/DeferredRouteVisualizations';

const geometry = {
  version: 1,
  revisionKey: 'revision-deferred-1',
  algorithmVersion: 'catalogue-v1',
  sequences: [{ coordinates: [[2.1, 50.9], [2.2, 50.8]] }],
  elevationProfile: null,
};

let intersectionCallback: IntersectionObserverCallback;

class FakeIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '320px 0px';
  readonly thresholds = [0];

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(geometry), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('waits for intersection before loading the same-origin geometry', async () => {
  render(
    <DeferredRouteVisualizations
      geometryPath="/itineraires-velo/calais-boulogne/geometry"
      elevationAvailable={false}
      departureName="Le Touquet-Paris-Plage"
      arrivalName="Camiers"
      directionLabel="du Touquet-Paris-Plage à Camiers"
      distanceMetres={1_000}
      basemapEnabled={false}
    />
  );

  expect(screen.getByText(
    'Situez cette portion sur la carte et zoomez pour voir les communes et les routes traversées. Le tracé affiché suit le parcours officiel du GTHF.'
  )).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByText('La carte se chargera à l’approche de cette section.')).toBeTruthy();

  act(() => {
    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });

  await waitFor(() => expect(fetch).toHaveBeenCalledWith(
    '/itineraires-velo/calais-boulogne/geometry',
    expect.objectContaining({ credentials: 'same-origin' })
  ));
  expect(await screen.findByText(/Carte de la portion du Touquet-Paris-Plage à Camiers/))
    .toBeTruthy();
  expect(screen.queryByLabelText(/Carte interactive/)).toBeNull();
});
