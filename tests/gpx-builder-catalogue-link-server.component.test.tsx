import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BuilderCatalogueMatch } from '../lib/gpx-builder/catalogue-link-core';

const mocks = vi.hoisted(() => ({
  getGuardedBuilderItineraries: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('../lib/itineraries/server.ts', () => ({
  getGuardedBuilderItineraries: mocks.getGuardedBuilderItineraries,
}));

import { getCatalogueItineraryLink } from '../lib/gpx-builder/catalogue-link-server';

const match: BuilderCatalogueMatch = {
  routeKey: 'gthf-main-loop',
  direction: 'BA',
  departureCityDocumentId: 'city-lievin',
  arrivalCityDocumentId: 'city-lens',
  departureAnchor: {
    chapterDocumentId: 'chapter-lens',
    sourceSha256: 'a'.repeat(64),
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex: 18,
    fraction: 0.75,
  },
  arrivalAnchor: {
    chapterDocumentId: 'chapter-lens',
    sourceSha256: 'a'.repeat(64),
    trackIndex: 0,
    segmentIndex: 0,
    pointIndex: 4,
    fraction: 0.25,
  },
  chapters: [{
    chapterDocumentId: 'chapter-lens',
    sourceSha256: 'a'.repeat(64),
    junctionAfter: null,
  }],
  usesLoopOrigin: false,
  warnings: [],
};

describe('getCatalogueItineraryLink', () => {
  beforeEach(() => {
    mocks.getGuardedBuilderItineraries.mockReset();
    mocks.getGuardedBuilderItineraries.mockResolvedValue([]);
  });

  it('skips the catalogue lookup for a direction that cannot expose a public link', async () => {
    await expect(getCatalogueItineraryLink(match)).resolves.toBeNull();
    expect(mocks.getGuardedBuilderItineraries).not.toHaveBeenCalled();
  });
});
