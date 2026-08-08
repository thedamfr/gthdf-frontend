import { createHash } from 'node:crypto';

import {
  computeArtifactIntegrityHash,
  guardCityItinerary,
} from '../lib/itineraries/guard.ts';
import type {
  CityItineraryRecord,
  GuardedItinerary,
} from '../lib/itineraries/types.ts';

export const TEST_NOW = '2026-08-07T10:00:00.000Z';

export function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function hashFixture(character: string): string {
  return character.repeat(64);
}

export function geometryArtifactFixture(): Record<string, unknown> {
  return {
    version: 1,
    revisionKey: 'revision-1',
    algorithmVersion: 'catalogue-v1',
    sequences: [
      { coordinates: [[2.1, 50.9, 4], [2.2, 50.8, 8]] },
      { coordinates: [[2.3, 50.7, 7], [2.4, 50.6, 6]] },
    ],
    elevationProfile: [
      {
        sequenceIndex: 0,
        points: [
          { distanceMetres: 0, elevationMetres: 4 },
          { distanceMetres: 500, elevationMetres: 8 },
        ],
      },
      {
        sequenceIndex: 1,
        points: [
          { distanceMetres: 500, elevationMetres: 7 },
          { distanceMetres: 1_000, elevationMetres: 6 },
        ],
      },
    ],
  };
}

export function verifiedItineraryFixture(): {
  record: CityItineraryRecord;
  guarded: GuardedItinerary;
  gpxBytes: Uint8Array;
  geometryBytes: Uint8Array;
} {
  const departure = {
    documentId: 'city-calais',
    name: 'Calais',
    slug: 'calais',
    hasPublicPage: true,
    publishedAt: TEST_NOW,
  };
  const arrival = {
    documentId: 'city-boulogne',
    name: 'Boulogne-sur-Mer',
    slug: 'boulogne-sur-mer',
    hasPublicPage: true,
    publishedAt: TEST_NOW,
  };
  const gpxBytes = new TextEncoder().encode(
    '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg /></trk></gpx>'
  );
  const geometryBytes = new TextEncoder().encode(JSON.stringify(geometryArtifactFixture()));
  const sourceHash = hashFixture('a');
  const generatedGpxSha256 = sha256(gpxBytes);
  const displayGeometrySha256 = sha256(geometryBytes);

  const record: CityItineraryRecord = {
    documentId: 'itinerary-1',
    businessKey: 'gthf-main-loop:FR-62160:FR-62193',
    title: 'Calais – Boulogne-sur-Mer',
    slug: 'calais-boulogne-sur-mer',
    reviewStatus: 'approved',
    publicationNext: true,
    seoStatus: 'indexable',
    featuredOnCityPages: true,
    currentEvaluationHash: hashFixture('e'),
    updatedAt: TEST_NOW,
    publishedAt: TEST_NOW,
    cityA: departure,
    cityB: arrival,
    route: {
      documentId: 'route-1',
      name: 'Grand Tour des Hauts-de-France',
      routeKey: 'gthf-main-loop',
      catalogueEnabled: true,
      algorithmVersion: 'catalogue-v1',
      currentInputFingerprint: hashFixture('f'),
      publishedAt: TEST_NOW,
    },
    activeRevision: {
      documentId: 'revision-1',
      revisionKey: 'revision-1',
      itinerary: {
        documentId: 'itinerary-1',
        businessKey: 'gthf-main-loop:FR-62160:FR-62193',
      },
      departure,
      arrival,
      distanceMetres: 1_000,
      asTheCrowFliesMetres: 750,
      elevationGainMetres: 12,
      elevationLossMetres: 10,
      elevationAvailable: true,
      eligibleByRoute: true,
      eligibleByDirect: true,
      detourRatio: 1.33,
      usesLoopOrigin: false,
      junctionWarnings: [],
      chaptersOnRoute: [{
        routeOrder: 0,
        distanceMetres: 1_000,
        direction: 'ba',
        chapter: {
          documentId: 'chapter-1',
          title: 'Calais → Boulogne-sur-Mer',
          slug: 'calais-boulogne-sur-mer',
          publishedAt: TEST_NOW,
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
          chainageFromDepartureMetres: 1_000,
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
      lastVerifiedEvaluationHash: hashFixture('e'),
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
      updatedAt: TEST_NOW,
    },
  };

  const result = guardCityItinerary(record, { catalogueEnabled: true });
  if (!result.ok) {
    throw new Error(`Invalid verified itinerary fixture: ${result.reason}`);
  }
  return { record, guarded: result.value, gpxBytes, geometryBytes };
}
