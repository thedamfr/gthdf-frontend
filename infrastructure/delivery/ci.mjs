import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { gitFingerprints, planDelivery } from './plan.mjs';
import { requireImageRevision } from './image-proof.mjs';

function run(file, args, options = {}) {
  const result = spawnSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
  if (result.status !== 0) throw new Error(`${file} ${args[0]} failed`);
  return result.stdout;
}

const [component, repository, deployer] = process.argv.slice(2);
if (!['frontend', 'cms'].includes(component)) throw new Error('Invalid component');
const revision = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(revision ?? '') || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Only the exact main revision may be published');
if (run('git', ['-C', repository, 'rev-parse', 'HEAD']).trim() !== revision) throw new Error('Checkout does not match the event');
const deployerRevision = run('git', ['-C', deployer, 'rev-parse', 'HEAD']).trim();
const output = resolve(process.env.RUNNER_TEMP ?? '.', 'gthdf-release');
mkdirSync(output, { recursive: true });
const enabled = process.env.GTHDF_DELIVERY_ENABLED === 'true';
const target = process.env.GTHDF_SSH_TARGET;
if (enabled && !/^[a-z][a-z0-9_-]*@penthouse\.taild95457\.ts\.net$/.test(target ?? '')) throw new Error('Unexpected deployment SSH target');
let baseline;
if (enabled) {
  baseline = JSON.parse(run('ssh', ['-o', 'BatchMode=yes', target, 'cat /home/ubuntu/gthdf-delivery/production.json']));
}
const previous = baseline?.components?.[component];
const fingerprints = gitFingerprints(repository, revision);
const plan = planDelivery(fingerprints, previous?.fingerprints);
if (enabled && component === 'frontend' && plan.postgres) {
  throw new Error('PostgreSQL image changes require a separate reviewed backup and rollout plan');
}
const imageName = `ghcr.io/thedamfr/gthdf-${component}`;
const tag = `${imageName}:sha-${revision}`;
let image = previous?.image;
let imageRevision = previous?.revision;
const startedAt = new Date().toISOString();
if (plan.build) {
  const existing = spawnSync('docker', ['buildx', 'imagetools', 'inspect', tag, '--format', '{{json .Manifest}}'], { encoding: 'utf8' });
  let digest;
  if (existing.status === 0) {
    digest = JSON.parse(existing.stdout).digest;
  } else {
    const metadata = join(output, 'build.json');
    run('docker', ['buildx', 'build', repository, '--file', join(repository, 'Dockerfile'), '--platform', 'linux/amd64', '--provenance=false', '--sbom=false', '--push', '--tag', tag, '--build-arg', `GTHDF_REVISION=${revision}`, '--metadata-file', metadata], { stdio: 'inherit' });
    digest = JSON.parse(readFileSync(metadata, 'utf8'))['containerimage.digest'];
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(digest ?? '')) throw new Error('Missing immutable build digest');
  // Inspect the resolved digest, not the tag which may move between requests.
  const imageConfig = JSON.parse(run('docker', ['buildx', 'imagetools', 'inspect', `${imageName}@${digest}`, '--format', '{{json .Image}}']));
  requireImageRevision(imageConfig, revision);
  image = `${imageName}@${digest}`;
  imageRevision = revision;
}
const schemas = {};
if (component === 'cms') {
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === 'schema.json' || (path.includes('/src/components/') && entry.name.endsWith('.json'))) schemas[path.slice(resolve(repository).length + 1)] = JSON.parse(readFileSync(path, 'utf8'));
    }
  };
  walk(join(resolve(repository), 'src'));
}
const candidate = {
  owner: `github-${component}-${process.env.GITHUB_RUN_ID}`,
  startedAt,
  deployerRevision,
  plan,
  components: { [component]: { image, revision: imageRevision, processedRevision: revision, fingerprints, ...(component === 'cms' ? { schemas } : {}) } },
};
const candidateFile = join(output, 'candidate.json');
writeFileSync(candidateFile, JSON.stringify(candidate, null, 2));
if (enabled) {
  const archive = join(output, 'deployer.tar');
  execFileSync('git', ['-C', deployer, 'archive', '--format=tar', '--output', archive, deployerRevision]);
  run('ansible-playbook', ['-i', `${target},`, join(deployer, 'infrastructure/ansible/playbooks/delivery.yml'), '--extra-vars', JSON.stringify({ gthdf_candidate_file: candidateFile, gthdf_deployer_archive: archive, gthdf_deployer_revision: deployerRevision, gthdf_candidate_id: candidate.owner })], { stdio: 'inherit' });
  writeFileSync(join(output, 'verified.json'), run('ssh', ['-o', 'BatchMode=yes', target, 'cat /home/ubuntu/gthdf-delivery/production.json']));
}
const summary = `GTHF ${component}\n\nSource: ${revision}\nImage: ${image}\nBuild: ${plan.build}\nDelivery: ${enabled ? 'verified' : 'bootstrap: image published, no deployment'}\n`;
writeFileSync(join(output, 'summary.txt'), summary);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
