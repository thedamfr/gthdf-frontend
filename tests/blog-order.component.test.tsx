import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  draftMode: vi.fn(async () => ({ isEnabled: true })),
}));

import { getArticles } from '../lib/strapi';

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

it('orders draft articles by creation date when publication dates are null', async () => {
  await getArticles();

  expect(requestUrl).toBeDefined();
  const query = new URL(requestUrl!).searchParams;
  expect(query.get('status')).toBe('draft');
  expect(query.get('sort[0]')).toBe('publishedAt:desc');
  expect(query.get('sort[1]')).toBe('createdAt:desc');
});
