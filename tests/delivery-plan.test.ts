import assert from 'node:assert/strict';
import test from 'node:test';
import { fingerprintEntries, classifyInput, planDelivery } from '../infrastructure/delivery/plan.mjs';

test('a documentation push still delivers runtime inputs missed by the previous failed push', () => {
  const plan = planDelivery({ runtime: 'new', infrastructure: 'same', postgres: 'same' }, {
    runtime: 'old', infrastructure: 'same', postgres: 'same',
  });
  assert.equal(plan.build, true);
  assert.equal(plan.infrastructure, false);
});

test('missing baseline requires qualification; identical runtime inputs reuse the image', () => {
  const current = { runtime: 'app', infrastructure: 'infra', postgres: 'pg' };
  assert.deepEqual(planDelivery(current, null), { build: true, infrastructure: true, postgres: true });
  assert.deepEqual(planDelivery(current, current), { build: false, infrastructure: false, postgres: false });
});

test('narrative docs and tests do not rebuild runtime; data and unknown files do', () => {
  const initial = fingerprintEntries([['app/page.tsx', 'aaa']]);
  const documentation = fingerprintEntries([['app/page.tsx', 'aaa'], ['documentation/runbook.md', 'bbb'], ['tests/qa.test.ts', 'ccc']]);
  assert.deepEqual(initial, documentation);
  assert.equal(classifyInput('documentation/data/villes.csv'), 'runtime');
  assert.equal(classifyInput('new-runtime.conf'), 'runtime');
  assert.equal(classifyInput('infrastructure/docker/postgres/Dockerfile'), 'postgres');
  assert.equal(classifyInput('infrastructure/kubernetes/base/cms.yaml'), 'infrastructure');
});
