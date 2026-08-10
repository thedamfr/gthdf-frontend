import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGpxBuilderManifest: vi.fn(),
  getHomepage: vi.fn(),
}));

vi.mock('@/components/gpx-builder/GpxBuilderForm', () => ({
  default: () => <div data-testid="builder-form" />,
}));
vi.mock('@/components/gpx-builder/GpxBuilderRouteContext', () => ({
  default: () => <div data-testid="route-context" />,
}));
vi.mock('@/lib/gpx-builder/manifest', () => ({
  toPublicGpxBuilderManifest: (manifest: unknown) => manifest,
}));
vi.mock('@/lib/gpx-builder/server', () => ({
  getGpxBuilderManifest: mocks.getGpxBuilderManifest,
}));
vi.mock('@/lib/strapi', () => ({
  getHomepage: mocks.getHomepage,
}));
vi.mock('@/lib/trusted-media-url', () => ({
  resolveTrustedMediaUrl: vi.fn(),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => <a href={href} {...props}>{children}</a>,
}));

import GpxBuilderPage from '../app/gpx-builder/page';

afterEach(() => cleanup());

beforeEach(() => {
  mocks.getGpxBuilderManifest.mockReset();
  mocks.getHomepage.mockReset();
  mocks.getGpxBuilderManifest.mockResolvedValue({ enabled: true });
  mocks.getHomepage.mockResolvedValue(null);
});

describe('GpxBuilderPage', () => {
  it('links the advice block to the server-rendered itinerary index', async () => {
    render(await GpxBuilderPage());

    const note = screen.getByRole('complementary', { name: 'À savoir' });
    const link = within(note).getByRole('link', { name: 'Voir tous les itinéraires à vélo' });
    expect(link.getAttribute('href')).toBe('/itineraires-velo');
  });
});
