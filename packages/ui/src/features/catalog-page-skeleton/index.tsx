import { Skeleton } from '../../shared/ui/skeleton';
import { MovieRowSkeleton } from '../movie-row/movie-row-skeleton';
import { cn } from '../../shared/utils';

interface CatalogPageSkeletonProps {
  rowCount?: number;
  showFilters?: boolean;
  className?: string;
}

export function CatalogPageSkeleton({
  rowCount = 4,
  showFilters = true,
  className,
}: CatalogPageSkeletonProps) {
  return (
    <div className={cn('page-shell', className)} aria-busy="true" aria-label="Cargando catálogo">
      <div className="mb-10 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-64 max-w-full" />
        <Skeleton className="h-5 w-48" />
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-full sm:w-40" />
            <Skeleton className="h-11 w-full sm:w-32" />
          </div>
        )}
      </div>
      <div className="space-y-10">
        {Array.from({ length: rowCount }).map((_, i) => (
          <MovieRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
