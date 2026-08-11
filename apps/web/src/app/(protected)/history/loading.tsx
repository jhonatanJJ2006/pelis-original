import { ContinueWatchingRowSkeleton } from '@pelis/ui/features/continue-watching-row';
import { Skeleton } from '@pelis/ui/components';

export default function HistoryLoading() {
  return (
    <div className="page-shell space-y-12" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>
      <ContinueWatchingRowSkeleton />
      <ContinueWatchingRowSkeleton count={6} />
    </div>
  );
}
