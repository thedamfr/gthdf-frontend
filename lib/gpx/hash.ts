import { createHash } from 'node:crypto';

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}
