import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GpxBuilderForm', () => {
  it('offers direction and searchable city-to-city selection without upload', () => {
    const view = render(<GpxBuilderForm manifest={manifest} />);

    expect((view.getByRole('radio', { name: 'Sens Lille → Arras' }) as HTMLInputElement).checked).toBe(true);
    expect(view.queryByLabelText(/fichier|upload/i)).toBeNull();
    expect(view.queryByText(/fusion/i)).toBeNull();
    expect(view.getByRole('combobox', { name: 'Ville de départ' })).toBeTruthy();
    expect(view.getByRole('combobox', { name: 'Ville d’arrivée' })).toBeTruthy();

    fireEvent.change(view.getByRole('searchbox', { name: 'Rechercher une ville de départ' }), {
      target: { value: 'rijsel' },
    });
    const departureOptions = within(view.getByRole('combobox', { name: 'Ville de départ' }));
    expect(departureOptions.getByRole('option', { name: 'Lille' })).toBeTruthy();
    expect(departureOptions.queryByRole('option', { name: 'Arras' })).toBeNull();
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

    fireEvent.change(view.getByRole('combobox', { name: 'Ville de départ' }), {
      target: { value: manifest.directions.AB.stops[0].id },
    });
    fireEvent.change(view.getByRole('combobox', { name: 'Ville d’arrivée' }), {
      target: { value: manifest.directions.AB.stops[2].id },
    });
    fireEvent.click(view.getByRole('button', { name: 'Prévisualiser mon parcours' }));

    await waitFor(() => expect(view.getByText('42,6 km')).toBeTruthy());
    expect(view.getByText(/D\+ 310 m/)).toBeTruthy();
    expect((view.getByRole('button', { name: 'Télécharger mon GPX' }) as HTMLButtonElement).disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/api/gpx-builder/preview', expect.objectContaining({
      method: 'POST',
    }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      direction: 'AB',
      departureId: manifest.directions.AB.stops[0].id,
      arrivalId: manifest.directions.AB.stops[2].id,
      revision: manifest.revision,
    });
  });

  it('announces preview errors assertively', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: { message: 'La trace officielle est indisponible.' },
      }),
    }));
    const view = render(<GpxBuilderForm manifest={manifest} />);

    fireEvent.change(view.getByRole('combobox', { name: 'Ville de départ' }), {
      target: { value: manifest.directions.AB.stops[0].id },
    });
    fireEvent.change(view.getByRole('combobox', { name: 'Ville d’arrivée' }), {
      target: { value: manifest.directions.AB.stops[2].id },
    });
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

    fireEvent.change(view.getByRole('combobox', { name: 'Ville de départ' }), {
      target: { value: manifest.directions.AB.stops[0].id },
    });
    fireEvent.change(view.getByRole('combobox', { name: 'Ville d’arrivée' }), {
      target: { value: manifest.directions.AB.stops[2].id },
    });
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

  it('resets both cities when the direction changes', () => {
    const view = render(<GpxBuilderForm manifest={manifest} />);
    const departure = view.getByRole('combobox', { name: 'Ville de départ' });
    fireEvent.change(departure, {
      target: { value: manifest.directions.AB.stops[0].id },
    });

    fireEvent.click(view.getByRole('radio', { name: 'Sens Arras → Lille' }));

    expect((view.getByRole('combobox', { name: 'Ville de départ' }) as HTMLSelectElement).value).toBe('');
    expect((view.getByRole('combobox', { name: 'Ville d’arrivée' }) as HTMLSelectElement).value).toBe('');
    expect(view.getByText(/villes ont été réinitialisées/i)).toBeTruthy();
  });
});
