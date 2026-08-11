import { Suspense } from 'react';
import { MovieDetailSkeleton } from '@pelis/ui/features/movie-detail-skeleton';
import MovieDetailPageClient from './movie-detail-client';

export default function MovieDetailPage() {
  return (
    <Suspense fallback={<MovieDetailSkeleton />}>
      <MovieDetailPageClient />
    </Suspense>
  );
}
