import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('itinerary recommendation queries', () => {
  it('bounds the city catalogue request to the five candidates rendered by the page', async () => {
    vi.stubEnv('STRAPI_URL', 'https://cms.example.test');
    vi.stubEnv('STRAPI_API_TOKEN', 'server-token');

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/global') {
        return new Response(JSON.stringify({
          data: { publishCityItinerariesToNext: true },
        }), { headers: { 'content-type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        data: Array.from({ length: 5 }, (_, index) => ({
          documentId: `invalid-candidate-${index}`,
        })),
        meta: { pagination: { page: 1, pageCount: 2 } },
      }), { headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getCityPageItineraries } = await import('../lib/itineraries/server');
    await getCityPageItineraries('city-abbeville');

    const catalogueRequests = fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname === '/api/city-itineraries');

    expect(catalogueRequests).toHaveLength(1);
    expect(catalogueRequests[0].searchParams.get('pagination[pageSize]')).toBe('5');
    expect(catalogueRequests[0].searchParams.getAll('sort[0]')).toEqual([
      'featuredOnCityPages:desc',
    ]);
    expect(catalogueRequests[0].searchParams.get('sort[1]')).toBe('editorialOrder:asc');
    expect(catalogueRequests[0].searchParams.get('sort[2]')).toBe(
      'activeRevision.distanceMetres:asc'
    );
    expect(catalogueRequests[0].searchParams.get('sort[3]')).toBe('title:asc');
    expect(catalogueRequests[0].searchParams.get('sort[4]')).toBe('slug:asc');
    expect(Array.from(catalogueRequests[0].searchParams.values())).toEqual(
      expect.arrayContaining(['fromLabel', 'toLabel'])
    );
  });
});
