import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GpxBuilderForm from '../components/gpx-builder/GpxBuilderForm';
import type { PublicGpxBuilderManifest } from '../lib/gpx-builder/manifest';

const manifest: PublicGpxBuilderManifest = {
  enabled: true,
  revision: 'a'.repeat(24),
  directions: {
    AB: {
      label: 'Sens Lille → Arras',
      stops: [
        { id: `stop_${'1'.repeat(16)}`, name: 'Lille', alternativeNames: ['Rijsel'], context: null },
        { id: `stop_${'2'.repeat(16)}`, name: 'Le Portel', alternativeNames: [], context: null },
        { id: `stop_${'3'.repeat(16)}`, name: 'Arras', alternativeNames: [], context: null },
      ],
    },
    BA: {
      label: 'Sens Arras → Lille',
      stops: [
        { id: `stop_${'3'.repeat(16)}`, name: 'Arras', alternativeNames: [], context: null },
        { id: `stop_${'2'.repeat(16)}`, name: 'Le Portel', alternativeNames: [], context: null },
        { id: `stop_${'1'.repeat(16)}`, name: 'Lille', alternativeNames: ['Rijsel'], context: null },
      ],
    },
  },
};

function chooseCity(
  view: ReturnType<typeof render>,
  label: string,
  cityName: string
): void {
  const combobox = view.getByRole('combobox', { name: label });
  fireEvent.focus(combobox);
  fireEvent.change(combobox, { target: { value: cityName } });
  fireEvent.click(view.getByRole('option', { name: cityName }));
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GpxBuilderForm', () => {
  it('offers two city comboboxes without exposing direction or upload', () => {
    const view = render(<GpxBuilderForm manifest={manifest} />);

    expect(view.queryByRole('radio')).toBeNull();
    expect(view.queryByLabelText(/fichier|upload/i)).toBeNull();
    expect(view.queryByText(/fusion/i)).toBeNull();
    expect(view.getByRole('combobox', { name: 'Ville de départ' })).toBeTruthy();
    expect(view.getByRole('combobox', { name: 'Ville d’arrivée' })).toBeTruthy();
    expect(view.getByText(/portion officielle la plus courte/i)).toBeTruthy();

    const departure = view.getByRole('combobox', { name: 'Ville de départ' });
    fireEvent.focus(departure);
    fireEvent.change(departure, {
      target: { value: 'rijsel' },
    });
    expect(view.getByRole('option', { name: 'Lille' })).toBeTruthy();
    expect(view.queryByRole('option', { name: 'Arras' })).toBeNull();
    fireEvent.keyDown(departure, { key: 'Enter' });
    expect((departure as HTMLInputElement).value).toBe('Lille');
  });

  it('announces an empty combobox result as a disabled option', () => {
    const view = render(<GpxBuilderForm manifest={manifest} />);
    const departure = view.getByRole('combobox', { name: 'Ville de départ' });

    fireEvent.change(departure, { target: { value: 'ville absente' } });

    const noResult = view.getByText('Aucune ville trouvée');
    expect(noResult.getAttribute('role')).toBe('option');
    expect(noResult.getAttribute('aria-disabled')).toBe('true');
    expect(view.getByRole('listbox')).toBeTruthy();
  });

  it('previews the selection, then enables the official GPX download', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        summary: {
          departureName: 'Lille',
          arrivalName: 'Arras',
          direction: 'AB',
          distanceMetres: 42_600,
          elevationAvailable: true,
          elevationGainMetres: 310,
          elevationLossMetres: 280,
          chapterCount: 2,
          chapterTitles: ['Lille → Arras', 'Arras → Amiens'],
          sequenceCount: 1,
          usesLoopOrigin: false,
          warnings: [],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<GpxBuilderForm manifest={manifest} />);

    chooseCity(view, 'Ville de départ', 'Lille');
    chooseCity(view, 'Ville d’arrivée', 'Arras');
    fireEvent.click(view.getByRole('button', { name: 'Prévisualiser mon parcours' }));

    await waitFor(() => expect(view.getByText('42,6 km')).toBeTruthy());
    expect(view.getByText(/D\+ 310 m/)).toBeTruthy();
    expect((view.getByRole('button', { name: 'Télécharger mon GPX' }) as HTMLButtonElement).disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/api/gpx-builder/preview', expect.objectContaining({
      method: 'POST',
    }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      departureId: manifest.directions.AB.stops[0].id,
      arrivalId: manifest.directions.AB.stops[2].id,
      revision: manifest.revision,
    });
  });

  it('shows the canonical catalogue page as a secondary link when the server proves an exact match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        summary: {
          departureName: 'Lille',
          arrivalName: 'Arras',
          direction: 'AB',
          distanceMetres: 42_600,
          elevationAvailable: true,
          elevationGainMetres: 310,
          elevationLossMetres: 280,
          chapterCount: 1,
          chapterTitles: ['Lille → Arras'],
          sequenceCount: 1,
          usesLoopOrigin: false,
          warnings: [],
        },
        catalogueItineraryLink: {
          href: '/itineraires-velo/lille-a-arras',
          label: 'Découvrir cet itinéraire',
        },
      }),
    }));
    const view = render(<GpxBuilderForm manifest={manifest} />);

    chooseCity(view, 'Ville de départ', 'Lille');
    chooseCity(view, 'Ville d’arrivée', 'Arras');
    fireEvent.click(view.getByRole('button', { name: 'Prévisualiser mon parcours' }));

    const link = await view.findByRole('link', { name: 'Découvrir cet itinéraire' });
    expect(link.getAttribute('href')).toBe('/itineraires-velo/lille-a-arras');
    expect(view.getByText('Retrouvez sa carte, les villes traversées et son GPX officiel.')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Télécharger mon GPX' })).toBeTruthy();
  });

  it('ignores a catalogue link that is not a safe internal itinerary URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        summary: {
          departureName: 'Lille',
          arrivalName: 'Arras',
          direction: 'AB',
          distanceMetres: 42_600,
          elevationAvailable: false,
          elevationGainMetres: null,
          elevationLossMetres: null,
          chapterCount: 1,
          chapterTitles: ['Lille → Arras'],
          sequenceCount: 1,
          usesLoopOrigin: false,
          warnings: [],
        },
        catalogueItineraryLink: {
          href: 'https://example.test/admin',
          label: 'Découvrir cet itinéraire',
        },
      }),
    }));
    const view = render(<GpxBuilderForm manifest={manifest} />);

    chooseCity(view, 'Ville de départ', 'Lille');
    chooseCity(view, 'Ville d’arrivée', 'Arras');
    fireEvent.click(view.getByRole('button', { name: 'Prévisualiser mon parcours' }));

    await view.findByText('42,6 km');
    expect(view.queryByRole('link', { name: 'Découvrir cet itinéraire' })).toBeNull();
  });

  it('announces preview errors assertively', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: { message: 'La trace officielle est indisponible.' },
      }),
    }));
    const view = render(<GpxBuilderForm manifest={manifest} />);

    chooseCity(view, 'Ville de départ', 'Lille');
    chooseCity(view, 'Ville d’arrivée', 'Arras');
    fireEvent.click(view.getByRole('button', { name: 'Prévisualiser mon parcours' }));

    const alert = await view.findByRole('alert');
    expect(alert.textContent).toContain('La trace officielle est indisponible.');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
  });

  it('keeps the object URL alive until the browser can start the download', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          summary: {
            departureName: 'Lille',
            arrivalName: 'Arras',
            direction: 'AB',
            distanceMetres: 42_600,
            elevationAvailable: true,
            elevationGainMetres: 310,
            elevationLossMetres: 280,
            chapterCount: 1,
            chapterTitles: ['Lille → Arras'],
            sequenceCount: 1,
            usesLoopOrigin: false,
            warnings: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['gpx'])),
        headers: new Headers({
          'content-disposition': 'attachment; filename="gthf-lille-vers-arras-ab.gpx"',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const createObjectUrl = vi.fn().mockReturnValue('blob:gpx-download');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const view = render(<GpxBuilderForm manifest={manifest} />);

    chooseCity(view, 'Ville de départ', 'Lille');
    chooseCity(view, 'Ville d’arrivée', 'Arras');
    fireEvent.click(view.getByRole('button', { name: 'Prévisualiser mon parcours' }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(view.getByRole('button', { name: 'Télécharger mon GPX' }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:gpx-download');
  });

  it('keeps every qualified city available from either combobox', () => {
    const view = render(<GpxBuilderForm manifest={manifest} />);
    const departure = view.getByRole('combobox', { name: 'Ville de départ' });
    const arrival = view.getByRole('combobox', { name: 'Ville d’arrivée' });

    fireEvent.focus(departure);
    expect(view.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Arras',
      'Le Portel',
      'Lille',
    ]);
    fireEvent.blur(departure);
    fireEvent.focus(arrival);
    expect(view.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Arras',
      'Le Portel',
      'Lille',
    ]);
  });
});
