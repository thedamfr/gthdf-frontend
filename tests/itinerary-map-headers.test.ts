import assert from 'node:assert/strict';
import test from 'node:test';

import { itineraryResponseHeaders } from '../lib/itineraries/response-policy.ts';

test('itinerary responses do not disclose the route slug to the map provider', () => {
  assert.equal(
    itineraryResponseHeaders()['Referrer-Policy'],
    'strict-origin-when-cross-origin'
  );
});
