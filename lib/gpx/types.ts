export interface GpxPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface GpxSegment {
  trackIndex: number;
  segmentIndex: number;
  points: GpxPoint[];
}

export interface GpxTrack {
  trackIndex: number;
  segments: GpxSegment[];
}

export interface GpxDocument {
  tracks: GpxTrack[];
  pointCount: number;
}

export interface GpxAnchor {
  status: 'proposed' | 'validated' | 'stale';
  sourceSha256: string;
  trackIndex: number;
  segmentIndex: number;
  pointIndex: number;
  fraction: number;
  chainageMetres: number;
  projectedLatitude: number;
  projectedLongitude: number;
  distanceToCityMetres: number;
  algorithmVersion: string;
  reviewNote?: string | null;
}

export type GpxDirection = 'AB' | 'BA';
