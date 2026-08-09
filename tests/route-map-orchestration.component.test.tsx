import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../components/itineraries/InteractiveRouteMap', () => ({
  default: ({
    departureName,
    arrivalName,
    ready,
    onReady,
    onUnavailable,
  }: {
    departureName: string;
    arrivalName: string;
    ready: boolean;
    onReady: () => void;
    onUnavailable: () => void;
  }) => (
    <div
      aria-label={`Carte interactive de la portion de ${departureName} à ${arrivalName}`}
      data-ready={ready}
    >
      <button type="button" onClick={onReady}>Simuler la carte prête</button>
      <button type="button" onClick={onUnavailable}>Simuler le repli</button>
    </div>
  ),
}));

import RouteVisualization from '../components/itineraries/RouteVisualization';

const geometry = {
  version: 1 as const,
  revisionKey: 'revision-orchestration-1',
  algorithmVersion: 'catalogue-v1',
  sequences: [{ coordinates: [[2.1, 50.9], [2.2, 50.8]] as Array<[number, number]> }],
  elevationProfile: null,
};

afterEach(() => cleanup());

function renderVisualization() {
  return render(
    <RouteVisualization
      geometry={geometry}
      elevationAvailable={false}
      departureName="Calais"
      arrivalName="Boulogne-sur-Mer"
      distanceMetres={1_000}
      basemapEnabled
    />
  );
}

it('keeps the schematic during loading then replaces it when the map is ready', () => {
  const { container } = renderVisualization();
  const schematic = container.querySelector('[data-schematic-map]') as SVGElement;

  expect(schematic.parentElement?.hidden).toBe(false);
  expect(screen.getByText('Chargement du fond de carte…')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Simuler la carte prête' }));

  expect(schematic.parentElement?.hidden).toBe(true);
  expect(screen.queryByText('Chargement du fond de carte…')).toBeNull();
  expect(screen.getByLabelText(/Carte interactive/).getAttribute('data-ready')).toBe('true');
});

it('keeps the schematic and displays the useful message when the map fails', () => {
  const { container } = renderVisualization();
  const schematic = container.querySelector('[data-schematic-map]') as SVGElement;

  fireEvent.click(screen.getByRole('button', { name: 'Simuler le repli' }));

  expect(schematic.parentElement?.hidden).toBe(false);
  expect(screen.getByText(
    'Le fond de carte n’est pas disponible pour le moment. Le tracé officiel reste visible et le GPX peut toujours être téléchargé.'
  )).toBeTruthy();
});
