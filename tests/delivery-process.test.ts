import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { runDeployment } from '../infrastructure/delivery/deployment-process.mjs';

test('shutdown requests graceful rollback and waits for the deployer to finish', async () => {
  const child = new EventEmitter() as EventEmitter & { kill: (signal: string) => void };
  const signals = new EventEmitter();
  const sent: string[] = [];
  child.kill = signal => { sent.push(signal); };
  let deadline: (() => void) | undefined;
  let cleared = false;
  let settled = false;
  const result = runDeployment('python', [], { spawnProcess: () => child, signals,
    schedule: (callback: () => void) => { deadline = callback; return 1; },
    clear: () => { cleared = true; } });
  result.catch(() => { settled = true; });

  deadline?.();
  signals.emit('SIGTERM');
  await Promise.resolve();
  assert.deepEqual(sent, ['SIGTERM']);
  assert.equal(settled, false);
  child.emit('close', 1);
  await assert.rejects(result, /rollback/);
  assert.equal(cleared, true);
  assert.equal(signals.listenerCount('SIGTERM'), 0);
});
