'use client';

import Link from 'next/link';
import { Play, Clock } from 'lucide-react';
import { MoviePoster } from '../movie-poster';
import { cn, formatDuration, getProgressPercentage } from '../../shared/utils';
import type { MediaItem } from '../../shared/types';

interface ContinueWatchingCardProps {
  movie: MediaItem;
  progress: number;
  duration: number;
  onPreview?: () => void;
  active?: boolean;
}

export function ContinueWatchingCard({
  movie,
  progress,
  duration,
  onPreview,
  active = false,
}: ContinueWatchingCardProps) {
  const pct = getProgressPercentage(progress, duration);
  const remaining = Math.max(0, duration - progress);

  return (
    <Link
      href={`/movies/${movie._id}?play=true`}
      prefetch={false}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      className="card-container group relative block shrink-0 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent rounded-lg active:scale-[0.97] motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-expo"
    >
      <div
        className={cn(
          'relative aspect-video rounded-lg overflow-hidden border border-cinema-border bg-cinema-surface motion-safe:transition-[border-color,box-shadow] motion-safe:duration-normal',
          '[@media(hover:hover)_and_(pointer:fine)]:group-hover:border-cinema-accent [@media(hover:hover)_and_(pointer:fine)]:group-hover:ring-2 [@media(hover:hover)_and_(pointer:fine)]:group-hover:ring-cinema-accent',
          active && 'ring-2 ring-cinema-accent border-cinema-accent'
        )}
      >
        <MoviePoster
          src={movie.backdropImage ?? movie.image}
          alt={movie.name}
          className="w-full h-full object-contain object-center motion-safe:transition-transform motion-safe:duration-normal motion-safe:ease-out-expo [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/55 to-transparent z-[1]" />
        <div className="card-media-scrim absolute inset-0 z-[2]" aria-hidden />

        <div className="absolute top-3 left-3 z-[4]">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-cinema-elevated/90 px-2.5 py-1 rounded-full border border-cinema-accent/40 text-cinema-chalk">
            <Clock className="w-3 h-3 text-cinema-accent" aria-hidden />
            {pct}% visto
          </span>
        </div>

        <div className="card-actions-layer absolute inset-0 z-[3] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className="card-action-btn card-action-btn--play p-4 rounded-full bg-cinema-accent text-cinema-bg"
              aria-hidden
            >
              <Play className="w-6 h-6" fill="currentColor" />
            </div>
            <span
              className="card-action-btn text-xs text-cinema-chalk/90 bg-cinema-bg/70 px-3 py-1 rounded-full"
              aria-hidden
            >
              Retoma en {formatDuration(remaining)}
            </span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 z-[4]">
          <p className="font-medium text-cinema-chalk truncate mb-2.5 transition-colors [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-cinema-accent-light">
            {movie.name}
          </p>
          <div
            className="h-1 bg-cinema-chalk/20 rounded-full overflow-hidden"
            role="progressbar"
            aria-label={`Progreso de ${movie.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div className="h-full bg-cinema-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-cinema-silver mt-1.5">
            <span>
              {formatDuration(progress)} de {formatDuration(duration)}
            </span>
            <span className="font-medium text-cinema-accent-light">
              {remaining > 0 ? `Faltan ${formatDuration(remaining)}` : 'Completa'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
