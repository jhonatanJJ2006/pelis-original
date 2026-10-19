import { preloadQuery } from '@pelis/db/server';
import { HomePageClient } from './components/home-page-client';
import type { MediaItem } from '@pelis/ui/types';

export const revalidate = 3600;

export default async function HomePage() {
  // Next.js provides the request via `headers()` from `next/headers`,
  // but `preloadQuery` takes a Request. Build a minimal Request with empty
  // cookies — server components in Next.js 14 do not pass a Request object.
  const fakeReq = new Request('http://localhost/', { headers: new Headers() });
  const [featured, trending, series, genres] = await Promise.all([
    preloadQuery<MediaItem[]>('movies.getFeatured', {}, fakeReq),
    preloadQuery<MediaItem[]>('movies.getTrending', { limit: 12 }, fakeReq),
    preloadQuery<MediaItem[]>('movies.listSeries', { limit: 18 }, fakeReq),
    preloadQuery<string[]>('movies.getGenres', {}, fakeReq),
  ]);

  return <HomePageClient preloaded={{ featured, trending, series, genres }} />;
}
