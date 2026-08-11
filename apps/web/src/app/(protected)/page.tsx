import { preloadQuery } from 'convex/nextjs';
import { api } from '@pelis/convex';
import { HomePageClient } from './components/home-page-client';

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, trending, series, movies, genres] = await Promise.all([
    preloadQuery(api.movies.getFeatured, {}),
    preloadQuery(api.movies.getTrending, { limit: 12 }),
    preloadQuery(api.movies.listSeries, {}),
    preloadQuery(api.movies.list, { mediaType: 'movie' }),
    preloadQuery(api.movies.getGenres, {}),
  ]);

  return (
    <HomePageClient preloaded={{ featured, trending, movies, series, genres }} />
  );
}
