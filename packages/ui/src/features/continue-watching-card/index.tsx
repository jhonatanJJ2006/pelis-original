'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
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
      className="group relative shrink-0 w-[280px] sm:w-[320px] snap-start"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden border border-cinema-border bg-cinema-surface">
        <img
          src={movie.image}
          alt={movie.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-4 rounded-full bg-cinema-accent/90 text-white">
            <Play className="w-6 h-6" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-medium text-white truncate mb-2">{movie.name}</p>
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-cinema-accent rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">{pct}% completado</p>
        </div>
      </div>
    </Link>
  );
}
