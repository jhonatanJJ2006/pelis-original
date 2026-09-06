import { Skeleton } from '../../shared/ui/skeleton';
import { MovieGridSkeleton } from '../movie-card/movie-grid-skeleton';
import { ContinueWatchingRowSkeleton } from '../continue-watching-row/continue-watching-row-skeleton';

interface AccountPageSkeletonProps {
  variant?: 'grid' | 'history';
}

export function AccountPageSkeleton({ variant = 'grid' }: AccountPageSkeletonProps) {
  return (
    <div className="page-shell space-y-12" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>
      {variant === 'history' ? (
        <div className="space-y-12">
          <ContinueWatchingRowSkeleton />
          <ContinueWatchingRowSkeleton count={6} />
        </div>
      ) : (
        <>
          <Skeleton className="h-12 w-full max-w-md" />
          <MovieGridSkeleton />
        </>
      )}
    </div>
  );
}
