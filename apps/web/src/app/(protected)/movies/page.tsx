import { Suspense } from 'react';
import { preloadQuery } from '@pelis/db/server';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import type { PageResult } from '@pelis/ui/features/paginator';
import MoviesPageClient from './movies-page-client';
import { MOVIES_PAGE_SIZE } from './page-size';
import type { MediaItem } from '@pelis/ui/types';

export const revalidate = 3600;

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: { search?: string; genre?: string; year?: string; page?: string };
}) {
  const fakeReq = new Request('http://localhost/', { headers: new Headers() });
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);
  const initial = {
    search: searchParams.search ?? '',
    genre: searchParams.genre ?? '',
    year: searchParams.year ?? '',
    page,
  };
  const [movies, genres, years] = await Promise.all([
    preloadQuery<PageResult<MediaItem>>(
      'movies.page',
      {
        mediaType: initial.search ? undefined : 'movie',
        genre: initial.genre || undefined,
        year: initial.year || undefined,
        search: initial.search || undefined,
        limit: MOVIES_PAGE_SIZE,
        offset: (page - 1) * MOVIES_PAGE_SIZE,
      },
      fakeReq
    ),
    preloadQuery<string[]>('movies.getGenres', {}, fakeReq),
    preloadQuery<string[]>('movies.getYears', {}, fakeReq),
  ]);

  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <MoviesPageClient preloaded={{ movies, genres, years }} initial={initial} />
    </Suspense>
  );
}
