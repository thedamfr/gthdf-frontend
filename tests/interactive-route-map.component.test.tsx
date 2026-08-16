import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import InteractiveRouteMap from '../components/itineraries/InteractiveRouteMap';
import { OPEN_FREE_MAP_STYLE_URL } from '../lib/itineraries/map';

const geometry = {
  version: 1 as const,
  revisionKey: 'revision-map-1',
  algorithmVersion: 'catalogue-v1',
  sequences: [
    { coordinates: [[2.1, 50.9], [2.2, 50.8]] as Array<[number, number]> },
    { coordinates: [[2.3, 50.7], [2.4, 50.6]] as Array<[number, number]> },
  ],
  elevationProfile: null,
};

interface FakeControl {
  onAdd?: (map: FakeMap) => HTMLElement;
  onRemove?: () => void;
}

const mapInstances: FakeMap[] = [];
const navigationControls: FakeNavigationControl[] = [];

class FakeNavigationControl {
  constructor(public options: Record<string, unknown>) {
    navigationControls.push(this);
  }
}

class FakeMap {
  handlers = new Map<string, Set<(event?: unknown) => void>>();
  onceHandlers = new Map<string, Set<(event?: unknown) => void>>();
  sources: Array<[string, Record<string, unknown>]> = [];
  layers: Array<Record<string, unknown>> = [];
  controls: FakeControl[] = [];
  fitBounds = vi.fn();
  remove = vi.fn();
  dragRotate = { disable: vi.fn() };
  touchZoomRotate = { disableRotation: vi.fn() };
  keyboard = { disableRotation: vi.fn() };
  scrollZoom = { disable: vi.fn() };
  styleLoaded = false;

  constructor(public options: Record<string, unknown>) {
    mapInstances.push(this);
  }

  on(name: string, handler: (event?: unknown) => void) {
    const handlers = this.handlers.get(name) ?? new Set();
    handlers.add(handler);
    this.handlers.set(name, handlers);
    return this;
  }

  once(name: string, handler: (event?: unknown) => void) {
    const handlers = this.onceHandlers.get(name) ?? new Set();
    handlers.add(handler);
    this.onceHandlers.set(name, handlers);
    return this;
  }

  emit(name: string, event?: unknown) {
    if (name === 'style.load') {
      this.styleLoaded = true;
    }
    this.handlers.get(name)?.forEach((handler) => handler(event));
    this.onceHandlers.get(name)?.forEach((handler) => handler(event));
    this.onceHandlers.delete(name);
  }

  isStyleLoaded() {
    return this.styleLoaded;
  }

  addSource(name: string, source: Record<string, unknown>) {
    this.sources.push([name, source]);
  }

  addLayer(layer: Record<string, unknown>) {
    this.layers.push(layer);
  }

  addControl(control: FakeControl) {
    this.controls.push(control);
    const element = control.onAdd?.(this);
    if (element) {
      (this.options.container as HTMLElement).append(element);
    }
    return this;
  }
}

vi.mock('maplibre-gl', () => ({
  Map: FakeMap,
  NavigationControl: FakeNavigationControl,
}));

beforeEach(() => {
  mapInstances.length = 0;
  navigationControls.length = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as WebGL2RenderingContext);
  vi.stubGlobal('getComputedStyle', vi.fn(() => ({
    getPropertyValue: (name: string) => ({
      '--color-bleu': '#216173',
      '--color-creme': '#FAEED4',
      '--color-vert': '#4D9678',
      '--color-rouge': '#F3492F',
      '--color-charbon': '#272624',
    })[name] ?? '',
  })));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('initializes the audited map, renders separate features and cleans it up', async () => {
  const onReady = vi.fn();
  const onUnavailable = vi.fn();
  const { unmount } = render(
    <InteractiveRouteMap
      geometry={geometry}
      directionLabel="de Calais à Boulogne-sur-Mer"
      ready={false}
      onReady={onReady}
      onUnavailable={onUnavailable}
    />
  );

  await waitFor(() => expect(mapInstances).toHaveLength(1));
  const map = mapInstances[0];
  expect(map.options).toMatchObject({
    style: OPEN_FREE_MAP_STYLE_URL,
    bounds: [[2.1, 50.6], [2.4, 50.9]],
    fitBoundsOptions: { maxZoom: 14, duration: 0 },
    scrollZoom: false,
    dragRotate: false,
    touchPitch: false,
    cooperativeGestures: true,
    maxPitch: 0,
    attributionControl: {},
  });
  expect(navigationControls[0]?.options).toMatchObject({
    showCompass: false,
    showZoom: true,
  });
  expect(map.dragRotate.disable).toHaveBeenCalledOnce();
  expect(map.touchZoomRotate.disableRotation).toHaveBeenCalledOnce();
  expect(map.keyboard.disableRotation).toHaveBeenCalledOnce();
  expect(map.scrollZoom.disable).toHaveBeenCalledOnce();

  map.emit('style.load');
  expect(onReady).not.toHaveBeenCalled();

  map.emit('load');
  await waitFor(() => expect(onReady).toHaveBeenCalledOnce());

  const routeSource = map.sources.find(([name]) => name === 'gthdf-route')?.[1];
  expect((routeSource?.data as typeof geometry).sequences).toBeUndefined();
  expect((routeSource?.data as { features: unknown[] }).features).toHaveLength(2);
  expect(map.layers.map((layer) => layer.id)).toEqual([
    'gthdf-route-halo',
    'gthdf-route-line',
    'gthdf-departure',
    'gthdf-arrival',
    'gthdf-gap-circles',
    'gthdf-gap-labels',
  ]);
  expect(map.layers.find((layer) => layer.id === 'gthdf-gap-labels')?.layout)
    .toMatchObject({ 'text-font': ['Noto Sans Bold'] });
  expect(map.fitBounds).toHaveBeenCalledWith(
    [[2.1, 50.6], [2.4, 50.9]],
    expect.objectContaining({ maxZoom: 14 })
  );

  fireEvent.click(screen.getByRole('button', { name: 'Recentrer la portion' }));
  expect(map.fitBounds).toHaveBeenCalledTimes(2);
  expect(onUnavailable).not.toHaveBeenCalled();

  unmount();
  expect(map.remove).toHaveBeenCalledOnce();
});

it('initializes MapLibre with WebGL 1 when WebGL 2 is unavailable', async () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext)
    .mockReturnValueOnce(null)
    .mockReturnValueOnce({} as WebGLRenderingContext);

  render(
    <InteractiveRouteMap
      geometry={geometry}
      directionLabel="de Calais à Boulogne-sur-Mer"
      ready={false}
      onReady={vi.fn()}
      onUnavailable={vi.fn()}
    />
  );

  await waitFor(() => expect(mapInstances).toHaveLength(1));
});

it('falls back before importing MapLibre when WebGL is unavailable', () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  const onUnavailable = vi.fn();

  render(
    <InteractiveRouteMap
      geometry={geometry}
      directionLabel="de Calais à Boulogne-sur-Mer"
      ready={false}
      onReady={vi.fn()}
      onUnavailable={onUnavailable}
    />
  );

  expect(onUnavailable).toHaveBeenCalledOnce();
  expect(mapInstances).toHaveLength(0);
});

it('removes the map once when the initial style reports an error', async () => {
  const onUnavailable = vi.fn();
  const { unmount } = render(
    <InteractiveRouteMap
      geometry={geometry}
      directionLabel="de Calais à Boulogne-sur-Mer"
      ready={false}
      onReady={vi.fn()}
      onUnavailable={onUnavailable}
    />
  );

  await waitFor(() => expect(mapInstances).toHaveLength(1));
  const map = mapInstances[0];
  map.emit('error', { error: new Error('style unavailable') });

  await waitFor(() => expect(onUnavailable).toHaveBeenCalledOnce());
  expect(map.remove).toHaveBeenCalledOnce();
  unmount();
  expect(map.remove).toHaveBeenCalledOnce();
});

it('times out an initial style that never becomes ready', async () => {
  vi.useFakeTimers();
  const onUnavailable = vi.fn();
  render(
    <InteractiveRouteMap
      geometry={geometry}
      directionLabel="de Calais à Boulogne-sur-Mer"
      ready={false}
      onReady={vi.fn()}
      onUnavailable={onUnavailable}
    />
  );

  await vi.advanceTimersByTimeAsync(7_000);

  expect(onUnavailable).toHaveBeenCalledOnce();
  expect(mapInstances[0]?.remove).toHaveBeenCalledOnce();
});
