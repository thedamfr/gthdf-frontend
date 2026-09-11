import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function planDelivery(current, verified) {
  return {
    build: !verified || current.runtime !== verified.runtime,
    infrastructure: !verified || current.infrastructure !== verified.infrastructure,
    postgres: !verified || current.postgres !== verified.postgres,
  };
}

export function classifyInput(path) {
  if (path === 'infrastructure/delivery/staging-gateway.mjs') return 'runtime';
  if (path.startsWith('infrastructure/docker/postgres/')) return 'postgres';
  if (path.startsWith('infrastructure/')) return 'infrastructure';
  if (/^(tests\/|\.github\/)/.test(path) || /^(README|AGENTS|DESIGN|IMPLEMENTATION|VISUAL-GUIDE)\.md$/.test(path)) return 'validation';
  if (/^(documentation|docs)\/.*\.md$/.test(path)) return 'validation';
  // Data, migrations and unknown paths conservatively remain runtime inputs.
  return 'runtime';
}

export function fingerprintEntries(entries) {
  const groups = { runtime: [], infrastructure: [], postgres: [] };
  for (const [path, object] of entries) {
    const group = classifyInput(path);
    if (group !== 'validation') groups[group].push(`${path}\0${object}`);
  }
  return Object.fromEntries(Object.entries(groups).map(([group, values]) => [
    group, createHash('sha256').update(values.sort().join('\0')).digest('hex'),
  ]));
}

export function gitFingerprints(repository, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('An exact Git revision is required');
  const tree = execFileSync('git', ['-C', repository, 'ls-tree', '-r', '-z', revision], { encoding: 'utf8' });
  return fingerprintEntries(tree.split('\0').filter(Boolean).map((entry) => {
    const [object, path] = entry.split('\t');
    return [path, object];
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [repository, revision, baselineFile] = process.argv.slice(2);
  const fingerprints = gitFingerprints(repository, revision);
  const baseline = baselineFile ? JSON.parse(readFileSync(baselineFile, 'utf8')) : null;
  process.stdout.write(JSON.stringify({ revision, fingerprints, ...planDelivery(fingerprints, baseline?.fingerprints) }) + '\n');
}
