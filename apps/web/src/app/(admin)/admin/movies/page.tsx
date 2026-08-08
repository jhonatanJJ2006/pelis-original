import { Suspense } from 'react';
import { Spinner } from '@pelis/ui/components';
import AdminMoviesPageClient from './movies-page-client';

export default function AdminMoviesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24" role="status">
          <Spinner size="lg" />
        </div>
      }
    >
      <AdminMoviesPageClient />
    </Suspense>
  );
}
