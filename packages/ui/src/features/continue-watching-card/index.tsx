'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { MoviePoster } from '../movie-poster';
import { getProgressPercentage } from '../../shared/utils';
import type { MediaItem } from '../../shared/types';

interface ContinueWatchingCardProps {
  movie: MediaItem;
  progress: number;
  duration: number;
}

export function ContinueWatchingCard({
  movie,
  progress,
  duration,
}: ContinueWatchingCardProps) {
  const pct = getProgressPercentage(progress, duration);

  return (
    <Link
      href={`/movies/${movie._id}?play=true`}
      className="card-container group relative shrink-0 w-[280px] sm:w-[320px] snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 rounded-2xl active:scale-[0.97] motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-expo"
    >
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-cinema-border bg-cinema-surface motion-safe:transition-[border-color,box-shadow] motion-safe:duration-normal [@media(hover:hover)_and_(pointer:fine)]:group-hover:border-cinema-violet/50 [@media(hover:hover)_and_(pointer:fine)]:group-hover:shadow-[0_8px_32px_rgba(59,130,246,0.2)]">
        <MoviePoster
          src={movie.image}
          alt={movie.name}
          className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-normal motion-safe:ease-out-expo [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/50 to-transparent z-[1]" />
        <div className="card-media-scrim absolute inset-0 z-[2]" aria-hidden />
        <div className="card-actions-layer absolute inset-0 z-[3] flex items-center justify-center">
          <div className="card-action-btn card-action-btn--play p-4 rounded-full bg-cinema-accent text-white shadow-glow" aria-hidden>
            <Play className="w-6 h-6" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 z-[4]">
          <p className="font-medium text-white truncate mb-2">{movie.name}</p>
          <div className="h-1.5 bg-cinema-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cinema-accent to-cinema-violet rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-cinema-silver mt-1.5">{pct}% completado</p>
        </div>
      </div>
    </Link>
  );
}
