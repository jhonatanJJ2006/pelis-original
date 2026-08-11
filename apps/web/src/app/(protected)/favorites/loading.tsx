import { MovieGridSkeleton } from '@pelis/ui/features/movie-card';
import { Skeleton } from '@pelis/ui/components';

export default function FavoritesLoading() {
  return (
    <div className="page-shell" aria-busy="true" aria-label="Cargando">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-12 w-full max-w-md mb-8" />
      <MovieGridSkeleton />
    </div>
  );
}
