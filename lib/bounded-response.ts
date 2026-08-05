export class ResponseSizeLimitError extends Error {
  constructor() {
    super('Response exceeds the configured size limit.');
    this.name = 'ResponseSizeLimitError';
  }
}

/** Read a response incrementally so an untrusted body cannot exceed the limit in memory. */
export async function readResponseBytesWithLimit(
  response: Response,
  maximumBytes: number
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
    throw new RangeError('The response size limit must be a non-negative safe integer.');
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new ResponseSizeLimitError();
  }

  if (!response.body) {
    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      byteLength += value.byteLength;
      if (byteLength > maximumBytes) {
        await reader.cancel();
        throw new ResponseSizeLimitError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const payload = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return payload;
}
