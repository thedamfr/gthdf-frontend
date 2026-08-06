import assert from 'node:assert/strict';
import test from 'node:test';

import { readGpxBuilderRequest } from '../lib/gpx-builder/request.ts';

const VALID = {
  direction: 'AB',
  departureId: `stop_${'a'.repeat(16)}`,
  arrivalId: `stop_${'b'.repeat(16)}`,
  revision: 'c'.repeat(24),
};

function request(body: string, contentType = 'application/json') {
  return new Request('https://gthf.test/api/gpx-builder/preview', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
}

test('readGpxBuilderRequest accepts only the opaque selection contract', async () => {
  assert.deepEqual(
    await readGpxBuilderRequest(request(JSON.stringify(VALID))),
    VALID
  );

  for (const payload of [
    { ...VALID, direction: 'BA', sourceUrl: 'https://attacker.test/trace.gpx' },
    { ...VALID, departureId: 'Lille' },
    { ...VALID, revision: 'stale' },
  ]) {
    await assert.rejects(
      readGpxBuilderRequest(request(JSON.stringify(payload))),
      /invalide/
    );
  }
});

test('readGpxBuilderRequest rejects non-JSON and oversized bodies', async () => {
  await assert.rejects(
    readGpxBuilderRequest(request(JSON.stringify(VALID), 'text/plain')),
    /JSON/
  );
  await assert.rejects(
    readGpxBuilderRequest(request(`{"padding":"${'x'.repeat(5000)}"}`)),
    /volumineuse/
  );
});
