import { spawn } from 'node:child_process';

export function runDeployment(file, args, { spawnProcess = spawn, signals = process, schedule = setTimeout, clear = clearTimeout, onStop = () => {}, timeoutMs = 50 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(file, args, { stdio: 'ignore' });
    let stopping = false;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      onStop();
      child.kill('SIGTERM');
    };
    // SIGTERM asks the Python deployer to roll back. Never force-kill its child
    // from this watchdog; systemd retains a separate thirty-minute stop budget.
    const deadline = schedule(stop, timeoutMs);
    signals.once('SIGTERM', stop);
    signals.once('SIGINT', stop);
    const finish = error => {
      clear(deadline);
      signals.removeListener('SIGTERM', stop);
      signals.removeListener('SIGINT', stop);
      if (error) reject(error);
      else resolve();
    };
    child.once('error', () => finish(new Error('Cannot start the local deployer')));
    child.once('close', code => finish(code === 0 && !stopping ? null : new Error('Local delivery failed or was interrupted; inspect its private rollback history')));
  });
}
