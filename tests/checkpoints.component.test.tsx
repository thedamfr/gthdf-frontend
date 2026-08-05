import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  draftMode: vi.fn(async () => ({ isEnabled: false })),
}));

import { getCheckpoints } from '../lib/strapi';

let requestUrl: string | undefined;

beforeEach(() => {
  requestUrl = undefined;
  vi.stubGlobal('fetch', vi.fn(async (input) => {
    requestUrl = String(input);

    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }));
});

it('requests every checkpoint within the Strapi API limit', async () => {
  await getCheckpoints();

  expect(requestUrl).toBeDefined();
  expect(new URL(requestUrl!).searchParams.get('pagination[pageSize]')).toBe('100');
});
