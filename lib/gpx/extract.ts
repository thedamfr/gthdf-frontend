import { getAnchorSegment, materializeAnchorPoint } from './anchor.ts';
import { GpxContractError } from './parser.ts';
import type { GpxAnchor, GpxDocument, GpxPoint, GpxSegment } from './types.ts';

function orderedSegments(document: GpxDocument): GpxSegment[] {
  return document.tracks.flatMap((track) => track.segments);
}

function segmentOrdinal(document: GpxDocument, anchor: GpxAnchor): number {
  const segments = orderedSegments(document);
  const ordinal = segments.findIndex((segment) => (
    segment.trackIndex === anchor.trackIndex
    && segment.segmentIndex === anchor.segmentIndex
  ));

  if (ordinal === -1) {
    throw new GpxContractError('invalid_anchor', 'The anchor segment is not part of the source.');
  }
  return ordinal;
}

function samePoint(first: GpxPoint, second: GpxPoint): boolean {
  return first.latitude === second.latitude
    && first.longitude === second.longitude
    && first.elevation === second.elevation;
}

function appendDistinct(points: GpxPoint[], point: GpxPoint): void {
  if (points.length === 0 || !samePoint(points[points.length - 1], point)) {
    points.push({ ...point });
  }
}

function sliceSingleSegment(
  segment: GpxSegment,
  start: GpxAnchor,
  end: GpxAnchor,
  startPoint: GpxPoint,
  endPoint: GpxPoint
): GpxPoint[] {
  const points: GpxPoint[] = [];
  appendDistinct(points, startPoint);

  const firstSourceIndex = start.pointIndex + (start.fraction === 1 ? 2 : 1);
  const lastSourceIndex = end.pointIndex - (end.fraction === 0 ? 1 : 0);
  for (let index = firstSourceIndex; index <= lastSourceIndex; index += 1) {
    const point = segment.points[index];
    if (point) {
      appendDistinct(points, point);
    }
  }

  appendDistinct(points, endPoint);
  return points;
}

function sliceFromAnchor(segment: GpxSegment, anchor: GpxAnchor, point: GpxPoint): GpxPoint[] {
  const points: GpxPoint[] = [];
  appendDistinct(points, point);
  const firstSourceIndex = anchor.pointIndex + (anchor.fraction === 1 ? 2 : 1);
  for (let index = firstSourceIndex; index < segment.points.length; index += 1) {
    appendDistinct(points, segment.points[index]);
  }
  return points;
}

function sliceToAnchor(segment: GpxSegment, anchor: GpxAnchor, point: GpxPoint): GpxPoint[] {
  const points: GpxPoint[] = [];
  const lastSourceIndex = anchor.pointIndex - (anchor.fraction === 0 ? 1 : 0);
  for (let index = 0; index <= lastSourceIndex; index += 1) {
    appendDistinct(points, segment.points[index]);
  }
  appendDistinct(points, point);
  return points;
}

export function extractBetweenAnchors(
  document: GpxDocument,
  start: GpxAnchor,
  end: GpxAnchor
): GpxPoint[][] {
  const startSegment = getAnchorSegment(document, start);
  const endSegment = getAnchorSegment(document, end);
  const startOrdinal = segmentOrdinal(document, start);
  const endOrdinal = segmentOrdinal(document, end);
  const startPosition = start.pointIndex + start.fraction;
  const endPosition = end.pointIndex + end.fraction;

  if (
    startOrdinal > endOrdinal
    || (startOrdinal === endOrdinal && startPosition > endPosition)
  ) {
    throw new GpxContractError(
      'reverse_anchor_order',
      'The arrival anchor precedes the departure anchor in this source.'
    );
  }

  const startPoint = materializeAnchorPoint(document, start);
  const endPoint = materializeAnchorPoint(document, end);
  if (startOrdinal === endOrdinal) {
    return [sliceSingleSegment(startSegment, start, end, startPoint, endPoint)];
  }

  const segments = orderedSegments(document);
  return [
    sliceFromAnchor(startSegment, start, startPoint),
    ...segments
      .slice(startOrdinal + 1, endOrdinal)
      .map((segment) => segment.points.map((point) => ({ ...point }))),
    sliceToAnchor(endSegment, end, endPoint),
  ].filter((sequence) => sequence.length > 0);
}

export function extractFromAnchorToEnd(
  document: GpxDocument,
  start: GpxAnchor
): GpxPoint[][] {
  const segments = orderedSegments(document);
  const ordinal = segmentOrdinal(document, start);
  const segment = getAnchorSegment(document, start);
  const point = materializeAnchorPoint(document, start);

  return [
    sliceFromAnchor(segment, start, point),
    ...segments.slice(ordinal + 1).map((item) => item.points.map((value) => ({ ...value }))),
  ].filter((sequence) => sequence.length > 0);
}

export function extractFromStartToAnchor(
  document: GpxDocument,
  end: GpxAnchor
): GpxPoint[][] {
  const segments = orderedSegments(document);
  const ordinal = segmentOrdinal(document, end);
  const segment = getAnchorSegment(document, end);
  const point = materializeAnchorPoint(document, end);

  return [
    ...segments.slice(0, ordinal).map((item) => item.points.map((value) => ({ ...value }))),
    sliceToAnchor(segment, end, point),
  ].filter((sequence) => sequence.length > 0);
}

export function cloneAllSequences(document: GpxDocument): GpxPoint[][] {
  return orderedSegments(document).map((segment) => (
    segment.points.map((point) => ({ ...point }))
  ));
}
