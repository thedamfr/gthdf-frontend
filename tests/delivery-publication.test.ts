import assert from 'node:assert/strict';
import test from 'node:test';
import { requirePublication, publishCandidate } from '../infrastructure/delivery/publication.mjs';
import { localCandidate } from '../infrastructure/delivery/pull-policy.mjs';

test('a published candidate is eligible only after its exact main workflow succeeds', () => {
  const revision = 'a'.repeat(40);
  const publication = { component: 'frontend', repository: 'thedamfr/gthdf-frontend', runId: 123, runAttempt: 1, revision };
  const run = { id: 123, run_attempt: 1, head_sha: revision, head_branch: 'main', event: 'push', path: '.github/workflows/delivery.yml', status: 'completed', conclusion: 'success', repository: { full_name: publication.repository } };

  assert.doesNotThrow(() => requirePublication(publication, run, 'frontend'));
  assert.throws(() => requirePublication(publication, { ...run, conclusion: 'failure' }, 'frontend'));
});

test('local reconciliation compares the cumulative change with verified production', () => {
  const fingerprints = { runtime: 'b'.repeat(64), infrastructure: 'c'.repeat(64), postgres: 'd'.repeat(64) };
  const value = { image: `ghcr.io/thedamfr/gthdf-frontend@sha256:${'1'.repeat(64)}`, revision: 'a'.repeat(40), processedRevision: 'a'.repeat(40), fingerprints };
  const candidate = { owner: 'github-frontend-123', publication: { component: 'frontend', runId: 123, revision: value.processedRevision }, plan: { build: false, infrastructure: false, postgres: false }, components: { frontend: value } };
  const production = { components: { frontend: { ...value, image: 'old', fingerprints: { ...fingerprints, runtime: 'old' } } } };

  const selected = localCandidate(candidate, production, fingerprints, fingerprints);

  assert.equal(selected.plan.build, true);
  assert.equal(selected.components.frontend.image, value.image);

  const unchanged = localCandidate(candidate, { components: { frontend: value } }, fingerprints, fingerprints);
  assert.deepEqual(unchanged.plan, { build: false, infrastructure: false, postgres: false });
  assert.throws(() => localCandidate(candidate, production, { ...fingerprints, runtime: 'e'.repeat(64) }, fingerprints));
  assert.throws(() => localCandidate(candidate, production, fingerprints, { ...fingerprints, runtime: 'e'.repeat(64) }));
  assert.throws(() => localCandidate(candidate, { components: { frontend: { ...value, fingerprints: { ...fingerprints, postgres: 'e'.repeat(64) } } } }, fingerprints, fingerprints));
});

test('an obsolete main run cannot replace the candidate polled by the server', async () => {
  const writes: string[] = [];
  const github = async (path: string, options: { method?: string } = {}) => {
    if (options.method) writes.push(path);
    return { object: { sha: 'b'.repeat(40) } };
  };

  const published = await publishCandidate(github, { publication: { revision: 'a'.repeat(40) } });

  assert.equal(published, false);
  assert.deepEqual(writes, []);
});

test('only a fast-forward candidate pointer is published after checking main again', async () => {
  const revision = 'a'.repeat(40);
  const requests: { path: string; method?: string; body?: unknown }[] = [];
  const github = async (path: string, options: { method?: string; body?: unknown } = {}) => {
    requests.push({ path, ...options });
    if (path === 'git/ref/heads/main') return { object: { sha: revision } };
    if (path === 'git/ref/heads/gthdf-release') return { object: { sha: 'previous' } };
    return { sha: path === 'git/trees' ? 'tree' : 'commit' };
  };

  assert.equal(await publishCandidate(github, { publication: { revision } }), true);
  assert.deepEqual(requests.at(-1), { path: 'git/refs/heads/gthdf-release', method: 'PATCH', body: { sha: 'commit', force: false } });
  assert.deepEqual(requests.at(-2), { path: 'git/ref/heads/main' });
});
