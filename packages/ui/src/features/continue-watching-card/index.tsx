'use client';

import Link from 'next/link';
import { Play, Clock } from 'lucide-react';
import { MoviePoster } from '../movie-poster';
import { formatDuration, getProgressPercentage } from '../../shared/utils';
import type { MediaItem } from '../../shared/types';

interface ContinueWatchingCardProps {
  movie: MediaItem;
  progress: number;
  duration: number;
}

export function ContinueWatchingCard({ movie, progress, duration }: ContinueWatchingCardProps) {
  const pct = getProgressPercentage(progress, duration);
  const remaining = Math.max(0, duration - progress);

  return (
    <Link
      href={`/movies/${movie._id}?play=true`}
      prefetch={false}
      className="card-container group relative block shrink-0 w-[260px] sm:w-[300px] md:w-[340px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 rounded-2xl active:scale-[0.97] motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-expo"
    >
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-cinema-border bg-cinema-surface motion-safe:transition-[border-color,box-shadow] motion-safe:duration-normal [@media(hover:hover)_and_(pointer:fine)]:group-hover:border-cinema-violet/50 [@media(hover:hover)_and_(pointer:fine)]:group-hover:shadow-[0_8px_32px_rgba(59,130,246,0.25)]">
        <MoviePoster
          src={movie.image}
          alt={movie.name}
          className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-normal motion-safe:ease-out-expo [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/55 to-transparent z-[1]" />
        <div className="card-media-scrim absolute inset-0 z-[2]" aria-hidden />

        <div className="absolute top-3 left-3 z-[4]">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-cinema-elevated/90 px-2.5 py-1 rounded-full border border-cinema-violet/40 text-white">
            <Clock className="w-3 h-3 text-cinema-accent" aria-hidden />
            {pct}% visto
          </span>
        </div>

        <div className="card-actions-layer absolute inset-0 z-[3] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className="card-action-btn card-action-btn--play p-4 rounded-full bg-cinema-accent text-white shadow-glow"
              aria-hidden
            >
              <Play className="w-6 h-6" fill="currentColor" />
            </div>
            <span
              className="card-action-btn text-xs text-white/90 bg-cinema-bg/70 px-3 py-1 rounded-full"
              aria-hidden
            >
              Retoma en {formatDuration(remaining)}
            </span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 z-[4]">
          <p className="font-medium text-white truncate mb-2.5 transition-colors [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-cinema-accent-light">
            {movie.name}
          </p>
          <div className="h-2 bg-cinema-elevated/80 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-cinema-accent to-cinema-violet rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
            <span
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(59,130,246,0.9)] border-2 border-cinema-accent transition-all"
              style={{ left: `calc(${pct}% - 6px)` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-cinema-silver mt-1.5">
            <span>{formatDuration(progress)} de {formatDuration(duration)}</span>
            <span className="font-medium text-cinema-accent-light">
              {remaining > 0 ? `Faltan ${formatDuration(remaining)}` : '¡Completa!'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
