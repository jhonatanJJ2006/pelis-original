import type { MetadataRoute } from 'next';
import { PRODUCTION_URL } from '@/lib/app-download';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/playground'] }],
    sitemap: `${PRODUCTION_URL}/sitemap.xml`,
  };
}
