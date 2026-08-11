import { Suspense } from 'react';
import { preloadQuery } from 'convex/nextjs';
import { api } from '@pelis/convex';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import MoviesPageClient from './movies-page-client';

export const revalidate = 3600;

export default async function MoviesPage() {
  const [movies, genres, years] = await Promise.all([
    preloadQuery(api.movies.list, { mediaType: 'movie' }),
    preloadQuery(api.movies.getGenres, {}),
    preloadQuery(api.movies.getYears, {}),
  ]);

  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <MoviesPageClient preloaded={{ movies, genres, years }} />
    </Suspense>
  );
}
