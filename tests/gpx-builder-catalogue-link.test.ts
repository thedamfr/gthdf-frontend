import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadOptionalCatalogueItineraryLink,
  resolveCatalogueItineraryLink,
  type BuilderCatalogueMatch,
  type CatalogueItineraryMatchCandidate,
} from '../lib/gpx-builder/catalogue-link-core.ts';
import { catalogueCandidateFromGuardedItinerary } from '../lib/gpx-builder/catalogue-link-candidate.ts';
import type { GuardedItinerary } from '../lib/itineraries/types.ts';

const SOURCE_HASH = 'a'.repeat(64);

function matchFixture(): BuilderCatalogueMatch {
  return {
    routeKey: 'gthf-main-loop',
    direction: 'AB',
    departureCityDocumentId: 'city-lens',
    arrivalCityDocumentId: 'city-lievin',
    departureAnchor: {
      chapterDocumentId: 'chapter-lens',
      sourceSha256: SOURCE_HASH,
      trackIndex: 0,
      segmentIndex: 0,
      pointIndex: 4,
      fraction: 0.25,
    },
    arrivalAnchor: {
      chapterDocumentId: 'chapter-lens',
      sourceSha256: SOURCE_HASH,
      trackIndex: 0,
      segmentIndex: 0,
      pointIndex: 18,
      fraction: 0.75,
    },
    chapters: [{
      chapterDocumentId: 'chapter-lens',
      sourceSha256: SOURCE_HASH,
      junctionAfter: null,
    }],
    usesLoopOrigin: false,
    warnings: [],
  };
}

function candidateFixture(): CatalogueItineraryMatchCandidate {
  return {
    ...matchFixture(),
    slug: 'lens-a-lievin',
    direction: 'AB',
  };
}

test('an exact guarded catalogue candidate exposes its canonical itinerary link', () => {
  assert.deepEqual(
    resolveCatalogueItineraryLink(matchFixture(), [candidateFixture()]),
    {
      href: '/itineraires-velo/lens-a-lievin',
      label: 'Découvrir cet itinéraire',
    }
  );
});

test('partial, reversed, ambiguous or unsafe catalogue matches stay unlinked', () => {
  const mutations: Array<(candidate: CatalogueItineraryMatchCandidate) => void> = [
    (candidate) => { candidate.direction = 'BA'; },
    (candidate) => { candidate.routeKey = 'another-route'; },
    (candidate) => { candidate.departureCityDocumentId = 'city-lievin'; },
    (candidate) => { candidate.departureAnchor.fraction = 0.5; },
    (candidate) => { candidate.chapters[0].sourceSha256 = 'b'.repeat(64); },
    (candidate) => { candidate.slug = '../admin'; },
  ];

  for (const mutate of mutations) {
    const candidate = structuredClone(candidateFixture());
    mutate(candidate);
    assert.equal(resolveCatalogueItineraryLink(matchFixture(), [candidate]), null);
  }
  assert.equal(
    resolveCatalogueItineraryLink(matchFixture(), [candidateFixture(), candidateFixture()]),
    null
  );
  assert.equal(
    resolveCatalogueItineraryLink({ ...matchFixture(), direction: 'BA' }, [candidateFixture()]),
    null
  );
});

test('a catalogue lookup failure keeps the Builder preview available without a link', async () => {
  assert.equal(
    await loadOptionalCatalogueItineraryLink(async () => {
      throw new Error('strapi_503');
    }),
    null
  );
});

test('a guarded itinerary is normalized from its exact route sources and anchors', () => {
  const candidate = candidateFixture();
  const guarded = {
    record: {
      slug: candidate.slug,
      route: {
        routeKey: candidate.routeKey,
        segments: [{
          chapter: { documentId: 'chapter-lens' },
          direction: 'ab',
          sourceSha256: SOURCE_HASH,
          nextSourceSha256: SOURCE_HASH,
          junctionAfterStatus: 'exact',
          junctionAfterGapMetres: 0,
        }],
      },
    },
    revision: {
      departure: { documentId: candidate.departureCityDocumentId },
      arrival: { documentId: candidate.arrivalCityDocumentId },
      departureAnchor: {
        chapter: { documentId: candidate.departureAnchor.chapterDocumentId },
        sourceSegmentIndex: 0,
        sourceHash: candidate.departureAnchor.sourceSha256,
        trackIndex: candidate.departureAnchor.trackIndex,
        sourceTrackSegmentIndex: candidate.departureAnchor.segmentIndex,
        sourcePointIndex: candidate.departureAnchor.pointIndex,
        sourceFraction: candidate.departureAnchor.fraction,
        validationStatus: 'validated',
        sourceDirection: 'ab',
      },
      arrivalAnchor: {
        chapter: { documentId: candidate.arrivalAnchor.chapterDocumentId },
        sourceSegmentIndex: 0,
        sourceHash: candidate.arrivalAnchor.sourceSha256,
        trackIndex: candidate.arrivalAnchor.trackIndex,
        sourceTrackSegmentIndex: candidate.arrivalAnchor.segmentIndex,
        sourcePointIndex: candidate.arrivalAnchor.pointIndex,
        sourceFraction: candidate.arrivalAnchor.fraction,
        validationStatus: 'validated',
        sourceDirection: 'ab',
      },
      chaptersOnRoute: [{
        routeOrder: 0,
        direction: 'ab',
        chapter: { documentId: 'chapter-lens' },
      }],
      usesLoopOrigin: false,
    },
    dto: {
      slug: candidate.slug,
      junctionWarnings: [],
    },
  } as unknown as GuardedItinerary;

  assert.deepEqual(catalogueCandidateFromGuardedItinerary(guarded), candidate);
});
