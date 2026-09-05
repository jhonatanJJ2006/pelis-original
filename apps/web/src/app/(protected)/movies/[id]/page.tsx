import { Suspense } from 'react';
import { preloadQuery } from '@pelis/db/server';
import { MovieDetailSkeleton } from '@pelis/ui/features/movie-detail-skeleton';
import MovieDetailPageClient from './movie-detail-client';
import type { MediaItem } from '@pelis/ui/types';

export default async function MovieDetailPage({ params }: { params: { id: string } }) {
  const fakeReq = new Request('http://localhost/', { headers: new Headers() });
  const movie = await preloadQuery<MediaItem | null>('movies.getById', { id: params.id }, fakeReq);

  const related = movie?.data
    ? await preloadQuery<MediaItem[]>(
        'movies.getByGenre',
        { genre: movie.data.genre, limit: 12 },
        fakeReq
      )
    : undefined;

  return (
    <Suspense fallback={<MovieDetailSkeleton />}>
      <MovieDetailPageClient preloaded={{ movie, related }} />
    </Suspense>
  );
}
