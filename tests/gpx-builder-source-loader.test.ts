import assert from 'node:assert/strict';
import test from 'node:test';

import { loadOfficialGpxSource } from '../lib/gpx-builder/source-loader.ts';
import { sha256Hex } from '../lib/gpx/hash.ts';

const GPX = `<?xml version="1.0"?><gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="50" lon="2"/><trkpt lat="50" lon="2.001"/></trkseg></trk></gpx>`;
const BYTES = new TextEncoder().encode(GPX);

test('loadOfficialGpxSource loads a trusted, bounded source matching its fingerprint', async () => {
  let requestedUrl = '';
  const document = await loadOfficialGpxSource(
    { url: '/uploads/official.gpx' },
    sha256Hex(BYTES),
    {
      strapiUrl: 'https://cms.gthf.test',
      allowedOrigins: [],
      fetchImplementation: async (input, init) => {
        requestedUrl = String(input);
        assert.equal(init?.redirect, 'error');
        return new Response(BYTES, {
          status: 200,
          headers: { 'content-type': 'application/gpx+xml' },
        });
      },
    }
  );

  assert.equal(requestedUrl, 'https://cms.gthf.test/uploads/official.gpx');
  assert.equal(document.pointCount, 2);
});

test('loadOfficialGpxSource rejects untrusted and stale sources', async () => {
  const options = {
    strapiUrl: 'https://cms.gthf.test',
    allowedOrigins: [] as string[],
    fetchImplementation: async () => new Response(BYTES, { status: 200 }),
  };

  await assert.rejects(
    loadOfficialGpxSource(
      { url: 'https://attacker.test/trace.gpx' },
      sha256Hex(BYTES),
      options
    ),
    /indisponible/
  );
  await assert.rejects(
    loadOfficialGpxSource(
      { url: '/uploads/official.gpx' },
      'f'.repeat(64),
      options
    ),
    /actualisée/
  );
});

test('loadOfficialGpxSource rejects an oversized source before parsing it', async () => {
  await assert.rejects(
    loadOfficialGpxSource(
      { url: '/uploads/official.gpx' },
      sha256Hex(BYTES),
      {
        strapiUrl: 'https://cms.gthf.test',
        allowedOrigins: [],
        maximumBytes: 10,
        fetchImplementation: async () => new Response(BYTES, {
          status: 200,
          headers: { 'content-length': String(BYTES.byteLength) },
        }),
      }
    ),
    /trop volumineuse/
  );
});
