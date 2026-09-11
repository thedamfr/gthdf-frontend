/** Keep a new replica out of service until its own CMS configuration is usable. */
export async function contentReady(strapiUrl: string, token: string | undefined, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!token) return false;
  try {
    const response = await fetchImpl(new URL('/api/global?fields[0]=siteName&status=published', strapiUrl), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return false;
    const value = await response.json();
    return typeof value.data?.siteName === 'string' && value.data.siteName.length > 0;
  } catch {
    return false;
  }
}
