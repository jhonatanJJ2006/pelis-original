import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface ProfilePageSkeletonProps {
  className?: string;
}

export function ProfilePageSkeleton({ className }: ProfilePageSkeletonProps) {
  return (
    <div
      className={cn('page-shell max-w-3xl mx-auto', className)}
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-24 w-full mb-8 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
