import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface TvChannelGridSkeletonProps {
  count?: number;
  className?: string;
}

export function TvChannelGridSkeleton({ count = 12, className }: TvChannelGridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4',
        className
      )}
      aria-busy="true"
      aria-label="Cargando"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
      ))}
    </div>
  );
}
