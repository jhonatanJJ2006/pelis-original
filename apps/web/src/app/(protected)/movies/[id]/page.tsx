import { Suspense } from 'react';
import MovieDetailPageClient from './movie-detail-client';
import { Spinner } from '@pelis/ui/components';

export default function MovieDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      }
    >
      <MovieDetailPageClient />
    </Suspense>
  );
}
