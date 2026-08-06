import { parseOfficialGpx } from './parser.ts';
import type { GpxDirection, GpxPoint } from './types.ts';

export interface SerializeGpxPortionInput {
  departureName: string;
  arrivalName: string;
  direction: GpxDirection;
  generatedAt: Date;
  sequences: readonly (readonly GpxPoint[])[];
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatCoordinate(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError('A GPX coordinate is not finite.');
  }
  return value.toFixed(8).replace(/(?:\.0+|(?:(\.\d*?)0+))$/, '$1');
}

function formatElevation(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError('A GPX elevation is not finite.');
  }
  return value.toFixed(3).replace(/(?:\.0+|(?:(\.\d*?)0+))$/, '$1');
}

function serializePoint(point: GpxPoint): string {
  const latitude = formatCoordinate(point.latitude);
  const longitude = formatCoordinate(point.longitude);
  const elevation = point.elevation === undefined
    ? ''
    : `\n        <ele>${formatElevation(point.elevation)}</ele>`;

  return `      <trkpt lat="${latitude}" lon="${longitude}">${elevation}\n      </trkpt>`;
}

export function normalizeFilenamePart(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' et ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64)
    .replace(/-+$/g, '');

  return normalized || 'ville';
}

export function safeGpxFilename(
  departureName: string,
  arrivalName: string,
  direction: GpxDirection
): string {
  return `gthf-${normalizeFilenamePart(departureName)}-vers-${normalizeFilenamePart(arrivalName)}-${direction.toLowerCase()}.gpx`;
}

export function serializeGpxPortion(input: SerializeGpxPortionInput): string {
  if (!Number.isFinite(input.generatedAt.getTime())) {
    throw new RangeError('The GPX generation date is invalid.');
  }
  const sequences = input.sequences.filter((sequence) => sequence.length > 0);
  if (sequences.length === 0) {
    throw new RangeError('A generated GPX must contain at least one sequence.');
  }

  const routeName = `${input.departureName} → ${input.arrivalName} sur le GTHF`;
  const description = `Portion officielle du GTHF, sens ${input.direction}. Les horodatages des enregistrements sources sont omis.`;
  const trackSegments = sequences.map((sequence) => (
    `    <trkseg>\n${sequence.map(serializePoint).join('\n')}\n    </trkseg>`
  )).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GTHF GPX Builder" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <desc>${escapeXml(description)}</desc>
    <time>${input.generatedAt.toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
${trackSegments}
  </trk>
</gpx>`;

  parseOfficialGpx(xml);
  return xml;
}
