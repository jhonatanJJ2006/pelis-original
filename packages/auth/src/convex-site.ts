/**
 * Base same-origin para auth en el browser (proxy Next.js → Convex .site).
 * Evita errores CORS desde localhost.
 */
export function getAuthApiBase(): string {
  return '/api/auth';
}

/**
 * URL del sitio Convex (.convex.site) — uso en servidor / proxy.
 */
export function getConvexSiteUrl(): string {
  const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, '');

  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (cloud) {
    return cloud.replace('.convex.cloud', '.convex.site').replace(/\/$/, '');
  }

  return '';
}
