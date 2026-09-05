import { Suspense } from 'react';
import { preloadQuery } from '@pelis/db/server';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import SeriesPageClient from './series-page-client';
import type { MediaItem } from '@pelis/ui/types';

export const revalidate = 3600;

export default async function SeriesPage() {
  const fakeReq = new Request('http://localhost/', { headers: new Headers() });
  const series = await preloadQuery<MediaItem[]>('movies.listSeries', {}, fakeReq);

  return (
    <Suspense fallback={<CatalogPageSkeleton showFilters={false} />}>
      <SeriesPageClient preloaded={{ series }} />
    </Suspense>
  );
}
