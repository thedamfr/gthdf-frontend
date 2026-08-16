import { beforeEach, expect, it, vi } from 'vitest';

const { draftModeMock } = vi.hoisted(() => ({
  draftModeMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  draftMode: draftModeMock,
}));

import { getArticles } from '../lib/strapi';

let requestUrl: string | undefined;

beforeEach(() => {
  requestUrl = undefined;
  draftModeMock.mockResolvedValue({ isEnabled: true });
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

it('keeps the publication date as the only public recency sort', async () => {
  draftModeMock.mockResolvedValue({ isEnabled: false });

  await getArticles('published-order-test');

  expect(requestUrl).toBeDefined();
  const query = new URL(requestUrl!).searchParams;
  expect(query.get('status')).toBe('published');
  expect(query.get('sort[0]')).toBe('publishedAt:desc');
  expect(query.has('sort[1]')).toBe(false);
});
