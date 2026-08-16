import { Suspense } from 'react';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import AdminNewReleasesPageClient from './new-releases-page-client';

export default function AdminNewReleasesPage() {
  return (
    <Suspense fallback={<AdminTableSkeleton />}>
      <AdminNewReleasesPageClient />
    </Suspense>
  );
}
