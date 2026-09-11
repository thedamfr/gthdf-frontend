import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupRecipeData } from '../infrastructure/delivery/recipe-cleanup.mjs';

test('a failed article deletion still attempts upload deletion and fails the recipe', async () => {
  const calls: string[] = [];
  const failure = new Error('article deletion failed');
  await assert.rejects(cleanupRecipeData(
    async () => { calls.push('article'); throw failure; },
    async () => { calls.push('upload'); },
  ), failure);
  assert.deepEqual(calls, ['article', 'upload']);
});
