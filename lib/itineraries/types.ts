import type { CityBlock, CityMedia } from '../cities';

export type ItinerarySeoStatus = 'noindex' | 'indexable';
export type ItineraryReviewStatus = 'to_review' | 'approved' | 'rejected';
export type ItineraryCalculationStatus = 'ready' | 'warning' | 'error' | 'stale' | 'archived';
export type ArtifactIntegrityStatus = 'pending' | 'verified' | 'invalid';

export interface ItineraryMedia {
  id?: number;
  documentId?: string;
  url?: string | null;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
  updatedAt?: string | null;
  hash?: string | null;
}

export interface ItineraryCity {
  documentId?: string;
  name?: string;
  fromLabel?: string | null;
  toLabel?: string | null;
  slug?: string | null;
  hasPublicPage?: boolean;
  publishedAt?: string | null;
}

export interface ItineraryChapter {
  documentId?: string;
  title?: string;
  slug?: string;
  publishedAt?: string | null;
}

export interface ItineraryReferenceRoute {
  documentId?: string;
  name?: string;
  routeKey?: string;
  catalogueEnabled?: boolean;
  algorithmVersion?: string;
  currentInputFingerprint?: string;
  publishedAt?: string | null;
  segments?: ItineraryReferenceSegment[];
}

export interface ItineraryReferenceSegment {
  id?: number;
  direction?: 'ab' | 'ba';
  sourceSha256?: string;
  nextSourceSha256?: string;
  junctionAfterStatus?: 'proposed' | 'exact' | 'accepted_gap' | 'blocked' | 'stale';
  junctionAfterGapMetres?: number | null;
  chapter?: ItineraryChapter | null;
}

export interface ItineraryRouteAnchor {
  documentId?: string;
  sourceSegmentIndex?: number;
  trackIndex?: number;
  sourceTrackSegmentIndex?: number;
  sourcePointIndex?: number;
  sourceFraction?: number;
  sourceHash?: string;
  validationStatus?: 'proposed' | 'validated' | 'ambiguous' | 'stale' | 'rejected';
  sourceDirection?: 'ab' | 'ba';
  chapter?: ItineraryChapter | null;
}

export interface ItineraryChapterOnRoute {
  id?: number;
  routeOrder?: number;
  distanceMetres?: number | null;
  direction?: 'ab' | 'ba';
  chapter?: ItineraryChapter | null;
}

export interface ItineraryCityOnRoute {
  id?: number;
  routeOrder?: number;
  occurrenceIndex?: number | null;
  chainageFromDepartureMetres?: number | null;
  city?: ItineraryCity | null;
}

export interface RawJunctionWarning {
  code?: unknown;
  afterChapterSlug?: unknown;
  beforeChapterSlug?: unknown;
  gapMetres?: unknown;
  reviewNote?: unknown;
}

export interface ItineraryRevisionRelation {
  documentId?: string;
  businessKey?: string;
}

export interface ItineraryRevision {
  id?: number;
  documentId?: string;
  revisionKey?: string;
  itinerary?: ItineraryRevisionRelation | null;
  departure?: ItineraryCity | null;
  arrival?: ItineraryCity | null;
  departureAnchor?: ItineraryRouteAnchor | null;
  arrivalAnchor?: ItineraryRouteAnchor | null;
  distanceMetres?: number | null;
  asTheCrowFliesMetres?: number | null;
  elevationGainMetres?: number | null;
  elevationLossMetres?: number | null;
  elevationAvailable?: boolean;
  eligibleByRoute?: boolean;
  eligibleByDirect?: boolean;
  detourRatio?: number | null;
  usesLoopOrigin?: boolean;
  junctionWarnings?: unknown;
  chaptersOnRoute?: ItineraryChapterOnRoute[];
  citiesOnRoute?: ItineraryCityOnRoute[];
  generatedGpx?: ItineraryMedia | null;
  generatedGpxSha256?: string | null;
  displayGeometry?: ItineraryMedia | null;
  displayGeometrySha256?: string | null;
  sourceHash?: string | null;
  lastVerifiedEvaluationHash?: string | null;
  algorithmVersion?: string | null;
  calculationStatus?: ItineraryCalculationStatus | null;
  warningApproved?: boolean;
  warningApprovedAt?: string | null;
  warningApprovedBy?: string | null;
  artifactIntegrityStatus?: ArtifactIntegrityStatus | null;
  artifactIntegrityHash?: string | null;
  updatedAt?: string | null;
}

export interface ItinerarySeo {
  metaTitle?: string | null;
  metaDescription?: string | null;
  shareImage?: CityMedia | null;
}

export interface CityItineraryRecord {
  id?: number;
  documentId?: string;
  businessKey?: string;
  title?: string;
  slug?: string;
  route?: ItineraryReferenceRoute | null;
  cityA?: ItineraryCity | null;
  cityB?: ItineraryCity | null;
  activeRevision?: ItineraryRevision | null;
  reviewStatus?: ItineraryReviewStatus | null;
  publicationNext?: boolean;
  seoStatus?: ItinerarySeoStatus | null;
  featuredOnCityPages?: boolean;
  editorialOrder?: number | null;
  currentEvaluationHash?: string | null;
  introduction?: string | null;
  blocks?: CityBlock[];
  seo?: ItinerarySeo | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
}

export interface PublicItineraryCity {
  documentId: string;
  name: string;
  fromLabel?: string | null;
  toLabel?: string | null;
  href: string | null;
}

export interface PublicItineraryChapter {
  documentId: string;
  title: string;
  href: string;
  distanceMetres: number;
  direction: 'ab' | 'ba';
}

export interface PublicJunctionWarning {
  code: 'accepted_gap';
  afterChapterSlug: string;
  beforeChapterSlug: string;
  gapMetres: number;
  message: string;
}

export interface PublicItinerarySeo {
  metaTitle: string | null;
  metaDescription: string | null;
  shareImageUrl: string | null;
}

export interface PublicItinerary {
  documentId: string;
  businessKey: string;
  slug: string;
  title: string;
  routeName: string;
  departure: PublicItineraryCity;
  arrival: PublicItineraryCity;
  distanceMetres: number;
  elevationGainMetres: number | null;
  elevationLossMetres: number | null;
  elevationAvailable: boolean;
  usesLoopOrigin: boolean;
  junctionWarnings: PublicJunctionWarning[];
  chapters: PublicItineraryChapter[];
  cities: PublicItineraryCity[];
  introduction: string | null;
  blocks: CityBlock[];
  seo: PublicItinerarySeo;
  seoStatus: ItinerarySeoStatus;
  featuredOnCityPages: boolean;
  editorialOrder: number | null;
  revisionUpdatedAt: string;
  downloadPath: string;
  geometryPath: string;
  isPreview: boolean;
}

export interface GuardedItinerary {
  record: CityItineraryRecord;
  revision: ItineraryRevision;
  dto: PublicItinerary;
}

export interface ItineraryDisplaySequence {
  coordinates: Array<[number, number] | [number, number, number]>;
}

export interface ItineraryElevationPoint {
  distanceMetres: number;
  elevationMetres: number;
}

export interface ItineraryElevationSequence {
  sequenceIndex: number;
  points: ItineraryElevationPoint[];
}

export interface ItineraryDisplayGeometry {
  version: 1;
  revisionKey: string;
  algorithmVersion: string;
  sequences: ItineraryDisplaySequence[];
  elevationProfile: ItineraryElevationSequence[] | null;
}
