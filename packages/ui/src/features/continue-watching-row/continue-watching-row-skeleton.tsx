import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface ContinueWatchingRowSkeletonProps {
  count?: number;
  className?: string;
}

export function ContinueWatchingRowSkeleton({
  count = 4,
  className,
}: ContinueWatchingRowSkeletonProps) {
  return (
    <section className={cn('relative', className)} aria-busy="true" aria-label="Cargando">
      <div className="mb-4 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-1 py-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-[320px] sm:w-[360px] shrink-0 space-y-3">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
