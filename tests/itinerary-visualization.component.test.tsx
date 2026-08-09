import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import RouteVisualization from '../components/itineraries/RouteVisualization';

const geometry = {
  version: 1 as const,
  revisionKey: 'revision-1',
  algorithmVersion: 'catalogue-v1',
  sequences: [
    { coordinates: [[2.1, 50.9], [2.2, 50.8]] as Array<[number, number]> },
    { coordinates: [[2.3, 50.7], [2.4, 50.6]] as Array<[number, number]> },
  ],
  elevationProfile: [
    {
      sequenceIndex: 0,
      points: [
        { distanceMetres: 0, elevationMetres: 4 },
        { distanceMetres: 500, elevationMetres: 8 },
      ],
    },
    {
      sequenceIndex: 1,
      points: [
        { distanceMetres: 500, elevationMetres: 6 },
        { distanceMetres: 1_000, elevationMetres: 8 },
      ],
    },
  ],
};

afterEach(() => cleanup());

it('renders every geometry sequence without joining known gaps', () => {
  const { container } = render(
    <RouteVisualization
      geometry={geometry}
      elevationAvailable={false}
      departureName="Calais"
      arrivalName="Boulogne-sur-Mer"
      distanceMetres={1_000}
      basemapEnabled={false}
    />
  );

  expect(container.querySelectorAll('polyline')).toHaveLength(2);
  expect(screen.getByText(/2 segments séparés/i)).toBeTruthy();
  expect(screen.queryByText('Profil altimétrique')).toBeNull();
});

it('describes the route and keeps only the schematic map when the basemap is disabled', () => {
  const { container } = render(
    <RouteVisualization
      geometry={geometry}
      elevationAvailable={false}
      departureName="Calais"
      arrivalName="Boulogne-sur-Mer"
      distanceMetres={1_000}
      basemapEnabled={false}
    />
  );

  expect(screen.getByText(
    'Carte de la portion de Calais à Boulogne-sur-Mer. Distance : 1,0 km. Le tracé comporte 2 séquences séparées et 1 écart connu.'
  )).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Passer la carte' }).getAttribute('href'))
    .toBe('#itinerary-map-legend');
  expect(screen.getByText(
    'À cet endroit, les deux fichiers officiels ne se rejoignent pas exactement. Le GPX conserve ce décalage au lieu d’inventer un raccord.'
  )).toBeTruthy();
  expect(container.querySelectorAll('polyline')).toHaveLength(2);
  expect(screen.queryByLabelText(/Carte interactive/)).toBeNull();
});

it('renders the accessible profile only when altitude is qualified', () => {
  const { container } = render(
    <RouteVisualization
      geometry={geometry}
      elevationAvailable
      departureName="Calais"
      arrivalName="Boulogne-sur-Mer"
      distanceMetres={1_000}
      basemapEnabled={false}
    />
  );

  expect(screen.getByRole('heading', { name: 'Profil altimétrique' })).toBeTruthy();
  expect(screen.getByLabelText('1 km · 8 m d’altitude')).toBeTruthy();
  const controls = container.querySelectorAll('button[aria-label*="altitude"]');
  expect(controls.length).toBeGreaterThan(0);
  controls.forEach((control) => {
    expect((control as HTMLButtonElement).style.width).toBe('44px');
    expect((control as HTMLButtonElement).style.height).toBe('44px');
  });
});

it('renders a singleton zero-distance profile without invalid SVG coordinates', () => {
  const singleton = {
    ...geometry,
    sequences: [{ coordinates: [[2.1, 50.9]] as Array<[number, number]> }],
    elevationProfile: [{
      sequenceIndex: 0,
      points: [{ distanceMetres: 0, elevationMetres: 4 }],
    }],
  };
  const { container } = render(
    <RouteVisualization
      geometry={singleton}
      elevationAvailable
      departureName="Calais"
      arrivalName="Calais"
      distanceMetres={0}
      basemapEnabled={false}
    />
  );

  expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  expect(container.querySelector('[aria-label="0 km · 4 m d’altitude"]')).toBeTruthy();
  expect(screen.getByText(
    'Carte de la portion de Calais à Calais. Distance : 0,0 km. Le tracé comporte une séquence continue et aucun écart connu.'
  )).toBeTruthy();
});

it('keeps the schematic and explains the fallback when WebGL2 is unavailable', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const { container } = render(
    <RouteVisualization
      geometry={geometry}
      elevationAvailable={false}
      departureName="Calais"
      arrivalName="Boulogne-sur-Mer"
      distanceMetres={1_000}
      basemapEnabled
    />
  );

  expect(container.querySelector('[data-schematic-map]')).toBeTruthy();
  expect(screen.getByLabelText(
    'Carte interactive de la portion de Calais à Boulogne-sur-Mer'
  )).toBeTruthy();
  expect(screen.getByText(
    'Le fond de carte n’est pas disponible pour le moment. Le tracé officiel reste visible et le GPX peut toujours être téléchargé.'
  )).toBeTruthy();
});
