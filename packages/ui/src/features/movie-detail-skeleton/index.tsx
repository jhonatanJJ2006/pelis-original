import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface MovieDetailSkeletonProps {
  className?: string;
}

export function MovieDetailSkeleton({ className }: MovieDetailSkeletonProps) {
  return (
    <div className={cn('pb-12', className)} aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-[420px] md:h-[520px] w-full rounded-none" />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-8">
          <Skeleton className="w-full md:w-64 aspect-[2/3] shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4 max-w-md" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-12 w-36" />
              <Skeleton className="h-12 w-12" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-[150px] aspect-[2/3] shrink-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
