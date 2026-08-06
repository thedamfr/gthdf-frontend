import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeUtf8,
  readResponseBytesWithLimit,
  ResponseSizeLimitError,
} from '../lib/bounded-response.ts';

test('decodeUtf8 rejects malformed byte sequences', () => {
  assert.equal(decodeUtf8(new TextEncoder().encode('{"ok":true}')), '{"ok":true}');
  assert.throws(() => decodeUtf8(new Uint8Array([0xc3, 0x28])), TypeError);
});

test('readResponseBytesWithLimit reads a response up to the inclusive limit', async () => {
  const payload = await readResponseBytesWithLimit(
    new Response(new Uint8Array([1, 2, 3])),
    3
  );

  assert.deepEqual([...payload], [1, 2, 3]);
});

test('readResponseBytesWithLimit rejects an oversized declared length before reading', async () => {
  const response = new Response(new Uint8Array([1]), {
    headers: { 'Content-Length': '10' },
  });

  await assert.rejects(
    readResponseBytesWithLimit(response, 5),
    ResponseSizeLimitError
  );
});

test('readResponseBytesWithLimit cancels a streamed body as soon as it exceeds the limit', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.enqueue(new Uint8Array([4, 5, 6]));
    },
    cancel() {
      cancelled = true;
    },
  }));

  await assert.rejects(
    readResponseBytesWithLimit(response, 5),
    ResponseSizeLimitError
  );
  assert.equal(cancelled, true);
});
