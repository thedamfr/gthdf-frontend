export function requirePublication(publication, run, component) {
  if (!['frontend', 'cms'].includes(component)
      || publication?.component !== component
      || publication.repository !== `thedamfr/gthdf-${component}`
      || !Number.isSafeInteger(publication.runId) || publication.runId < 1
      || !Number.isSafeInteger(publication.runAttempt) || publication.runAttempt < 1
      || !/^[a-f0-9]{40}$/.test(publication.revision ?? '')
      || run?.id !== publication.runId || run.run_attempt !== publication.runAttempt
      || run.repository?.full_name !== publication.repository
      || run.head_sha !== publication.revision || run.head_branch !== 'main'
      || !['push', 'workflow_dispatch'].includes(run.event)
      || run.path !== '.github/workflows/delivery.yml'
      || run.status !== 'completed' || run.conclusion !== 'success') {
    throw new Error('The candidate requires a successful workflow for its exact main revision');
  }
}

export async function publishCandidate(github, candidate) {
  const current = await github('git/ref/heads/main');
  if (current.object.sha !== candidate.publication.revision) return false;
  const branch = await github('git/ref/heads/gthdf-release', { allowMissing: true });
  const tree = await github('git/trees', {
    method: 'POST', body: { tree: [{ path: 'candidate.json', mode: '100644', type: 'blob', content: JSON.stringify(candidate, null, 2) + '\n' }] },
  });
  const commit = await github('git/commits', {
    method: 'POST', body: { message: `Publish candidate ${candidate.publication.revision}`, tree: tree.sha, parents: branch ? [branch.object.sha] : [] },
  });
  // Check again after preparing the immutable objects, before moving the public pointer.
  if ((await github('git/ref/heads/main')).object.sha !== candidate.publication.revision) return false;
  if (branch) {
    await github('git/refs/heads/gthdf-release', { method: 'PATCH', body: { sha: commit.sha, force: false } });
  } else {
    await github('git/refs', { method: 'POST', body: { ref: 'refs/heads/gthdf-release', sha: commit.sha } });
  }
  return true;
}
