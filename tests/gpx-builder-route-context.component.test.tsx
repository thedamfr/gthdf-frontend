import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GpxBuilderRouteContext from '../components/gpx-builder/GpxBuilderRouteContext';

describe('GpxBuilderRouteContext', () => {
  it('explains that the generated GPX follows a section of the complete loop', () => {
    const view = render(
      <GpxBuilderRouteContext previewImageUrl="https://cms.gthf.fr/uploads/parcours-gthf.webp" />
    );

    expect(view.getByRole('heading', {
      name: 'Une section de la boucle GTHF',
    })).toBeTruthy();
    expect(view.getByText(
      /découvrir les Hauts-de-France à vélo, à leur rythme/i
    )).toBeTruthy();
    expect(view.getByText(
      /une journée, un week-end ou un voyage plus long/i
    )).toBeTruthy();
    expect(view.getByRole('img', {
      name: /parcours complet de la boucle gthf/i,
    })).toBeTruthy();
    expect(view.getByRole('link', {
      name: 'Découvrir le parcours complet',
    }).getAttribute('href')).toBe('/chapitres');
  });
});
