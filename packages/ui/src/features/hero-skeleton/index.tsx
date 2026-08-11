import { cn } from '../../shared/utils';

interface HeroSkeletonProps {
  className?: string;
}

export function HeroSkeleton({ className }: HeroSkeletonProps) {
  return (
    <section
      className={cn(
        'relative h-[75vh] min-h-[400px] sm:min-h-[500px] max-h-[900px] overflow-hidden bg-cinema-surface animate-pulse',
        className
      )}
      aria-label="Destacados"
      aria-busy="true"
    />
  );
}
