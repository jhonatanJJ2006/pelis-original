import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface AdminTableSkeletonProps {
  rows?: number;
  className?: string;
}

export function AdminTableSkeleton({ rows = 8, className }: AdminTableSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)} aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="md:hidden space-y-3">
        {Array.from({ length: Math.min(rows, 5) }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
      <div className="hidden md:block rounded-lg border border-cinema-border overflow-hidden">
        <Skeleton className="h-12 w-full rounded-none" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-none border-t border-cinema-border" />
        ))}
      </div>
    </div>
  );
}
