export type GeoPoint = [longitude: number, latitude: number];

export type BoundingBox = [
  minLongitude: number,
  minLatitude: number,
  maxLongitude: number,
  maxLatitude: number,
];

export type TraceDirection = 'AB' | 'BA';

export interface ProximityTrace {
  direction: TraceDirection;
  segments: GeoPoint[][];
  boundingBox: BoundingBox;
}

export interface ProximityIndexChapter {
  documentId: string;
  slug: string;
  displayOrder: number;
  boundingBox: BoundingBox;
  traces: ProximityTrace[];
}

export interface ProximityIndex {
  schemaVersion: 1;
  revision: string;
  chapters: ProximityIndexChapter[];
  partial: boolean;
}
