import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

import Header from '../components/Header';

describe('Header', () => {
  afterEach(cleanup);

  it('links to the GPX builder from the desktop and mobile navigation', () => {
    const view = render(<Header />);
    const desktopNavigation = view.getByRole('navigation', { name: 'Navigation principale' });

    expect(
      within(desktopNavigation)
        .getByRole('link', { name: 'Tracer mon parcours' })
        .getAttribute('href')
    ).toBe('/gpx-builder');

    fireEvent.click(view.getByRole('button', { name: 'Menu mobile' }));
    const mobileNavigation = view.getByRole('navigation', { name: 'Navigation mobile' });

    expect(
      within(mobileNavigation)
        .getByRole('link', { name: 'Tracer mon parcours' })
        .getAttribute('href')
    ).toBe('/gpx-builder');
  });

  it('expands the GTHF name for assistive technologies', () => {
    const view = render(<Header />);

    expect(
      view.getByRole('link', { name: 'Grand Tour des Hauts-de-France — accueil' })
        .getAttribute('href')
    ).toBe('/');
  });
});
