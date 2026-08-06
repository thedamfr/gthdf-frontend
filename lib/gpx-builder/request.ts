import {
  decodeUtf8,
  readResponseBytesWithLimit,
  ResponseSizeLimitError,
} from '../bounded-response.ts';
import type { GpxBuilderSelection } from './generate.ts';

const MAXIMUM_REQUEST_BYTES = 1024;
const STOP_ID = /^stop_[a-f0-9]{16}$/;
const REVISION = /^[a-f0-9]{24}$/;
const EXPECTED_KEYS = ['arrivalId', 'departureId', 'direction', 'revision'];

export class GpxBuilderRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GpxBuilderRequestError';
  }
}

export async function readGpxBuilderRequest(
  request: Request
): Promise<GpxBuilderSelection> {
  const contentType = request.headers.get('content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    throw new GpxBuilderRequestError('La requête doit utiliser le format JSON.');
  }

  let bytes: Uint8Array;
  try {
    bytes = await readResponseBytesWithLimit(
      new Response(request.body, {
        headers: request.headers,
      }),
      MAXIMUM_REQUEST_BYTES
    );
  } catch (error) {
    if (error instanceof ResponseSizeLimitError) {
      throw new GpxBuilderRequestError('La requête est trop volumineuse.');
    }
    throw new GpxBuilderRequestError('La requête est invalide.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(decodeUtf8(bytes));
  } catch {
    throw new GpxBuilderRequestError('La requête JSON est invalide.');
  }
  if (
    typeof payload !== 'object'
    || payload === null
    || Array.isArray(payload)
  ) {
    throw new GpxBuilderRequestError('La sélection est invalide.');
  }

  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== EXPECTED_KEYS.length
    || keys.some((key, index) => key !== EXPECTED_KEYS[index])
    || (record.direction !== 'AB' && record.direction !== 'BA')
    || typeof record.departureId !== 'string'
    || !STOP_ID.test(record.departureId)
    || typeof record.arrivalId !== 'string'
    || !STOP_ID.test(record.arrivalId)
    || typeof record.revision !== 'string'
    || !REVISION.test(record.revision)
  ) {
    throw new GpxBuilderRequestError('La sélection est invalide.');
  }

  return {
    direction: record.direction,
    departureId: record.departureId,
    arrivalId: record.arrivalId,
    revision: record.revision,
  };
}
