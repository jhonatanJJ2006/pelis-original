import { Suspense } from 'react';
import { preloadQuery } from '@pelis/db/server';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import type { PageResult } from '@pelis/ui/features/paginator';
import SeriesPageClient from './series-page-client';
import { SERIES_PAGE_SIZE } from './page-size';
import type { MediaItem } from '@pelis/ui/types';

export const revalidate = 3600;

export default async function SeriesPage({ searchParams }: { searchParams: { page?: string } }) {
  const fakeReq = new Request('http://localhost/', { headers: new Headers() });
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);
  const series = await preloadQuery<PageResult<MediaItem>>(
    'movies.page',
    { mediaType: 'series', limit: SERIES_PAGE_SIZE, offset: (page - 1) * SERIES_PAGE_SIZE },
    fakeReq
  );

  return (
    <Suspense fallback={<CatalogPageSkeleton showFilters={false} />}>
      <SeriesPageClient preloaded={{ series }} initialPage={page} />
    </Suspense>
  );
}
