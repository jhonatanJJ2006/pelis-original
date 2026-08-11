import { Suspense } from 'react';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import AdminMoviesPageClient from './movies-page-client';

export default function AdminMoviesPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton />}>
      <AdminMoviesPageClient />
    </Suspense>
  );
}
