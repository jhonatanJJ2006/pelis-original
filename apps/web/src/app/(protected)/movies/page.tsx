import { Suspense } from 'react';
import MoviesPageClient from './movies-page-client';
import { Spinner } from '@pelis/ui/components';

export default function MoviesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      }
    >
      <MoviesPageClient />
    </Suspense>
  );
}
