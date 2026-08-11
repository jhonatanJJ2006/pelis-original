import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface AdminDashboardSkeletonProps {
  className?: string;
}

export function AdminDashboardSkeleton({ className }: AdminDashboardSkeletonProps) {
  return (
    <div className={cn('space-y-8', className)} aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
