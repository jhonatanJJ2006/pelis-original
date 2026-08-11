import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/utils';

interface AdminFormSkeletonProps {
  className?: string;
}

export function AdminFormSkeleton({ className }: AdminFormSkeletonProps) {
  return (
    <div className={cn('max-w-2xl space-y-6', className)} aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-32" />
    </div>
  );
}
