import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface SubscribePageSkeletonProps {
  className?: string;
}

export function SubscribePageSkeleton({ className }: SubscribePageSkeletonProps) {
  return (
    <div className={cn('page-shell', className)} aria-busy="true" aria-label="Cargando">
      <div className="mb-10 space-y-2 text-center">
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
