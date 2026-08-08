import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeArtifactIntegrityHash,
  guardCityItinerary,
} from '../lib/itineraries/guard.ts';
import type { CityItineraryRecord } from '../lib/itineraries/types.ts';

const NOW = '2026-08-07T10:00:00.000Z';
const hash = (character: string) => character.repeat(64);

function fixture(): CityItineraryRecord {
  const sourceHash = hash('b');
  const generatedGpxSha256 = hash('c');
  const displayGeometrySha256 = hash('d');
  const departure = {
    documentId: 'city-calais',
    name: 'Calais',
    slug: 'calais',
    hasPublicPage: true,
    publishedAt: NOW,
  };
  const arrival = {
    documentId: 'city-boulogne',
    name: 'Boulogne-sur-Mer',
    slug: 'boulogne-sur-mer',
    hasPublicPage: false,
    publishedAt: NOW,
  };

  return {
    documentId: 'itinerary-1',
    businessKey: 'gthf-main-loop:FR-62193:FR-62160',
    title: 'Calais – Boulogne-sur-Mer',
    slug: 'calais-boulogne-sur-mer',
    reviewStatus: 'approved',
    publicationNext: true,
    seoStatus: 'indexable',
    featuredOnCityPages: true,
    currentEvaluationHash: hash('e'),
    updatedAt: NOW,
    publishedAt: NOW,
    cityA: arrival,
    cityB: departure,
    route: {
      documentId: 'route-1',
      name: 'Grand Tour des Hauts-de-France',
      routeKey: 'gthf-main-loop',
      catalogueEnabled: true,
      algorithmVersion: 'catalogue-v1',
      currentInputFingerprint: hash('f'),
      publishedAt: NOW,
    },
    activeRevision: {
      documentId: 'revision-1',
      revisionKey: 'revision-1',
      itinerary: {
        documentId: 'itinerary-1',
        businessKey: 'gthf-main-loop:FR-62193:FR-62160',
      },
      departure,
      arrival,
      distanceMetres: 51_234.56,
      asTheCrowFliesMetres: 31_000,
      elevationGainMetres: 420,
      elevationLossMetres: 410,
      elevationAvailable: true,
      eligibleByRoute: true,
      eligibleByDirect: true,
      detourRatio: 1.65,
      usesLoopOrigin: false,
      junctionWarnings: [{
        code: 'accepted_gap',
        afterChapterSlug: 'etaples-calais',
        beforeChapterSlug: 'calais-saint-omer',
        gapMetres: 40.8,
        reviewNote: 'note privée',
      }],
      chaptersOnRoute: [{
        routeOrder: 0,
        distanceMetres: 51_234.56,
        direction: 'ab',
        chapter: {
          documentId: 'chapter-1',
          title: 'Étaples → Calais',
          slug: 'etaples-calais',
          publishedAt: NOW,
        },
      }],
      citiesOnRoute: [
        {
          routeOrder: 0,
          occurrenceIndex: 0,
          chainageFromDepartureMetres: 0,
          city: departure,
        },
        {
          routeOrder: 1,
          occurrenceIndex: 0,
          chainageFromDepartureMetres: 51_234.56,
          city: arrival,
        },
      ],
      generatedGpx: {
        url: '/uploads/calais-boulogne-gthf.gpx',
        name: 'calais-boulogne-gthf.gpx',
        mime: 'application/gpx+xml',
        hash: 'calais_boulogne_gthf_12345678',
      },
      generatedGpxSha256,
      displayGeometry: {
        url: '/uploads/calais-boulogne-gthf.json',
        name: 'calais-boulogne-gthf.json',
        mime: 'application/json',
        hash: 'calais_boulogne_gthf_87654321',
      },
      displayGeometrySha256,
      sourceHash,
      lastVerifiedEvaluationHash: hash('e'),
      algorithmVersion: 'catalogue-v1',
      calculationStatus: 'ready',
      warningApproved: false,
      warningApprovedAt: null,
      warningApprovedBy: null,
      artifactIntegrityStatus: 'verified',
      artifactIntegrityHash: computeArtifactIntegrityHash({
        sourceHash,
        generatedGpxSha256,
        displayGeometrySha256,
      }),
      updatedAt: NOW,
    },
  };
}

test('the cumulative guard accepts a fully verified public itinerary', () => {
  const result = guardCityItinerary(fixture(), { catalogueEnabled: true });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.dto.departure.name, 'Calais');
  assert.equal(result.value.dto.departure.href, '/villes/calais');
  assert.equal(result.value.dto.arrival.href, null);
  assert.equal(result.value.dto.chapters[0].direction, 'ab');
  assert.match(result.value.dto.junctionWarnings[0].message, /rupture connue/i);
  assert.equal('reviewNote' in result.value.dto.junctionWarnings[0], false);
  assert.equal('generatedGpx' in result.value.dto, false);
});

test('the aggregate artifact hash matches the exact CMS canonical fixture', () => {
  assert.equal(
    computeArtifactIntegrityHash({
      sourceHash: hash('b'),
      generatedGpxSha256: hash('c'),
      displayGeometrySha256: hash('d'),
    }),
    'e467f9160bfb9e6653ec6a3ec35f67710b7c653b7c7de49d2fb7a9d89fa0241a'
  );
});

test('every publication layer fails closed', () => {
  const cases: Array<[string, (record: CityItineraryRecord) => void, string]> = [
    ['route', (record) => { record.route!.catalogueEnabled = false; }, 'route_unavailable'],
    ['city', (record) => { record.cityA!.publishedAt = null; }, 'city_unavailable'],
    ['itinerary', (record) => { record.publicationNext = false; }, 'itinerary_unavailable'],
    ['review', (record) => { record.reviewStatus = 'to_review'; }, 'editorial_review_required'],
    ['pair', (record) => {
      record.activeRevision!.arrival = {
        ...record.activeRevision!.arrival,
        documentId: 'another-city',
      };
    }, 'revision_mismatch'],
    ['stale', (record) => { record.currentEvaluationHash = hash('9'); }, 'revision_stale'],
    ['eligibility', (record) => {
      record.activeRevision!.eligibleByRoute = false;
      record.activeRevision!.eligibleByDirect = false;
    }, 'ineligible'],
    ['integrity', (record) => {
      record.activeRevision!.artifactIntegrityStatus = 'pending';
    }, 'artifact_unavailable'],
    ['integrity hash', (record) => {
      record.activeRevision!.artifactIntegrityHash = hash('0');
    }, 'artifact_unavailable'],
    ['route order', (record) => {
      record.activeRevision!.chaptersOnRoute![0].routeOrder = 5;
    }, 'invalid_public_data'],
    ['missing ready approval flag', (record) => {
      record.activeRevision!.warningApproved = undefined;
    }, 'revision_not_publishable'],
    ['city chainage', (record) => {
      record.activeRevision!.citiesOnRoute![1].chainageFromDepartureMetres = 12;
    }, 'invalid_public_data'],
  ];

  for (const [label, mutate, reason] of cases) {
    const record = fixture();
    mutate(record);
    const result = guardCityItinerary(record, { catalogueEnabled: true });
    assert.deepEqual(result, { ok: false, reason }, label);
  }

  assert.deepEqual(
    guardCityItinerary(fixture(), { catalogueEnabled: false }),
    { ok: false, reason: 'catalogue_disabled' }
  );
});

test('a warning revision requires an explicit, attributable approval', () => {
  const record = fixture();
  record.activeRevision!.calculationStatus = 'warning';

  assert.deepEqual(
    guardCityItinerary(record, { catalogueEnabled: true }),
    { ok: false, reason: 'revision_not_publishable' }
  );

  record.activeRevision!.warningApproved = true;
  record.activeRevision!.warningApprovedAt = NOW;
  record.activeRevision!.warningApprovedBy = 'editor-42';
  assert.equal(guardCityItinerary(record, { catalogueEnabled: true }).ok, true);
});

test('preview bypasses editorial flags but never hashes, integrity or eligibility', () => {
  const record = fixture();
  record.publishedAt = null;
  record.publicationNext = false;
  record.reviewStatus = 'to_review';
  record.route!.publishedAt = null;
  record.route!.catalogueEnabled = false;
  record.cityA!.publishedAt = null;
  record.activeRevision!.calculationStatus = 'warning';

  assert.equal(
    guardCityItinerary(record, { catalogueEnabled: false, preview: true }).ok,
    true
  );

  record.activeRevision!.lastVerifiedEvaluationHash = hash('0');
  assert.deepEqual(
    guardCityItinerary(record, { catalogueEnabled: false, preview: true }),
    { ok: false, reason: 'revision_stale' }
  );
});
