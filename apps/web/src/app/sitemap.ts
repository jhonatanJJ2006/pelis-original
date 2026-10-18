import type { MetadataRoute } from 'next';
import { PRODUCTION_URL } from '@/lib/app-download';

/** Páginas públicas estáticas (el catálogo se descubre navegando). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { path: '/inicio', priority: 1 },
    { path: '/', priority: 0.9 },
    { path: '/descargas', priority: 0.8 },
    { path: '/movies', priority: 0.7 },
    { path: '/series', priority: 0.7 },
    { path: '/anime', priority: 0.7 },
    { path: '/privacidad', priority: 0.3 },
    { path: '/terminos', priority: 0.3 },
  ].map(({ path, priority }) => ({
    url: `${PRODUCTION_URL}${path}`,
    changeFrequency: 'weekly' as const,
    priority,
  }));
}
