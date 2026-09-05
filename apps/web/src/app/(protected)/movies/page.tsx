import { Suspense } from 'react';
import { preloadQuery } from '@pelis/db/server';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import MoviesPageClient from './movies-page-client';
import type { MediaItem } from '@pelis/ui/types';

export const revalidate = 3600;

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: { search?: string; genre?: string; year?: string };
}) {
  const fakeReq = new Request('http://localhost/', { headers: new Headers() });
  const initial = {
    search: searchParams.search ?? '',
    genre: searchParams.genre ?? '',
    year: searchParams.year ?? '',
  };
  const [movies, genres, years] = await Promise.all([
    preloadQuery<MediaItem[]>('movies.list', { mediaType: 'movie' }, fakeReq),
    preloadQuery<string[]>('movies.getGenres', {}, fakeReq),
    preloadQuery<string[]>('movies.getYears', {}, fakeReq),
  ]);

  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <MoviesPageClient preloaded={{ movies, genres, years }} initial={initial} />
    </Suspense>
  );
}
