import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface MovieRowSkeletonProps {
  count?: number;
  showHeader?: boolean;
  className?: string;
}

export function MovieRowSkeleton({
  count = 6,
  showHeader = true,
  className,
}: MovieRowSkeletonProps) {
  return (
    <section className={cn('relative', className)} aria-busy="true" aria-label="Cargando">
      {showHeader && (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      )}
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-1 py-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-[150px] sm:w-[160px] md:w-[180px] shrink-0 space-y-2">
            <Skeleton className="aspect-[2/3] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}
