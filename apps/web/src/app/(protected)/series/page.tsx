import { Suspense } from 'react';
import { preloadQuery } from 'convex/nextjs';
import { api } from '@pelis/convex';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import SeriesPageClient from './series-page-client';

export const revalidate = 3600;

export default async function SeriesPage() {
  const series = await preloadQuery(api.movies.listSeries, {});

  return (
    <Suspense fallback={<CatalogPageSkeleton showFilters={false} />}>
      <SeriesPageClient preloaded={{ series }} />
    </Suspense>
  );
}
