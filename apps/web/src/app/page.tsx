import { preloadQuery } from 'convex/nextjs';
import { api } from '@pelis/convex';
import { HomePageClient } from './(protected)/components/home-page-client';
import { Header } from './(protected)/components/header';
import { Footer } from './(protected)/components/footer';

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
    <div className="min-h-screen flex flex-col">
      <Header sticky={false} />
      <main className="flex-1">
        <HomePageClient preloaded={{ featured, trending, movies, series, genres }} />
      </main>
      <Footer />
    </div>
  );
}