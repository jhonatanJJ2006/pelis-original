'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Heart, Play, Tv, Film, TrendingUp } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { useUser } from '@pelis/auth/hooks';
import { api } from '@pelis/convex';
import { toast } from 'sonner';
import { Badge } from '../../shared/ui/badge';
import { MoviePoster } from '../movie-poster';
import { cn } from '../../shared/utils';
import type { MediaItem } from '../../shared/types';

interface MovieCardProps {
  movie: MediaItem;
  showFavorite?: boolean;
  variant?: 'poster' | 'compact';
}

function MovieCardBase({ movie, showFavorite = true, variant = 'poster' }: MovieCardProps) {
  const { user } = useUser();
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);
  const isSeries = movie.mediaType === 'series';

  const isFavorited = useQuery(
    api.favorites.check,
    showFavorite && user ? { userId: user._id as any, movieId: movie._id as any } : 'skip'
  );

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Inicia sesión para guardar favoritos');
      return;
    }
    try {
      if (isFavorited) {
        await removeFavorite({ userId: user._id as any, movieId: movie._id as any });
        toast.success('Eliminado de favoritos');
      } else {
        await addFavorite({ userId: user._id as any, movieId: movie._id as any });
        toast.success('Agregado a favoritos');
      }
    } catch {
      toast.error('Error al actualizar favoritos');
    }
  };

  return (
    <Link
      href={`/movies/${movie._id}`}
      prefetch={false}
      draggable={false}
      className="card-container block group active:scale-[0.97] motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-expo"
    >
      <div
        className={cn(
          'rounded-2xl overflow-hidden',
          'bg-cinema-surface border border-cinema-border',
          'motion-safe:transition-[transform,border-color,box-shadow] motion-safe:duration-normal motion-safe:ease-out-expo',
          '[@media(hover:hover)_and_(pointer:fine)]:group-hover:border-cinema-violet/50',
          '[@media(hover:hover)_and_(pointer:fine)]:group-hover:shadow-[0_8px_32px_rgba(59,130,246,0.2)]',
          '[@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-1'
        )}
      >
        <div
          className={cn(
            'relative overflow-hidden',
            variant === 'poster' ? 'aspect-[2/3]' : 'aspect-video'
          )}
        >
          <MoviePoster
            src={movie.image}
            alt={movie.name}
            className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-slow motion-safe:ease-out-expo [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg/95 via-cinema-bg/30 to-transparent opacity-70 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-90 motion-safe:transition-opacity motion-safe:duration-normal z-[1]" />
          <div className="card-media-scrim absolute inset-0 z-[2]" aria-hidden />

          <div className="card-actions-layer absolute inset-0 z-[3] flex items-center justify-center">
            <div className="card-actions-toolbar flex items-center gap-3">
              <div
                className="card-action-btn card-action-btn--play p-3 rounded-full bg-cinema-accent text-white shadow-glow"
                aria-hidden
              >
                <Play className="w-5 h-5 card-play-icon" fill="currentColor" />
              </div>
              {showFavorite && (
                <button
                  type="button"
                  onClick={handleFavorite}
                  className={cn(
                    'card-action-btn card-action-btn--heart p-3 rounded-full motion-safe:active:scale-95',
                    isFavorited
                      ? 'bg-cinema-accent text-white shadow-glow'
                      : 'bg-cinema-elevated/90 text-white hover:bg-cinema-violet/40 border border-cinema-border'
                  )}
                  aria-label={isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={cn('w-5 h-5 card-heart-icon', isFavorited && 'fill-current')} />
                </button>
              )}
            </div>
          </div>
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-[5]">
            {isSeries ? (
              <Badge className="text-[10px] bg-cinema-gold text-black border-0 gap-1">
                <Tv className="w-3 h-3" />
                Serie
              </Badge>
            ) : (
              <Badge variant="primary" className="text-[10px] gap-1">
                <Film className="w-3 h-3" />
                Película
              </Badge>
            )}
          </div>
          <div className="absolute top-2 right-2 z-[5]">
            <Badge variant="violet" className="text-[10px] bg-cinema-elevated/80">
              {movie.classification}
            </Badge>
          </div>
          <div className="card-meta-reveal absolute bottom-2 left-2 right-2 flex items-center gap-2 z-[4]">
            <div className="flex items-center gap-1.5 text-[10px] text-cinema-muted bg-cinema-elevated/90 px-2.5 py-1.5 rounded-full">
              <TrendingUp className="w-3 h-3 text-cinema-accent" />
              <span>{movie.releaseYear}</span>
            </div>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate mb-1 transition-colors duration-200 group-hover:text-cinema-accent-light">
            {movie.name}
          </h3>
          <div className="flex items-center justify-between text-xs text-cinema-silver">
            <span className="truncate group-hover:text-cinema-muted">{movie.genre}</span>
            <span className="shrink-0 ml-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cinema-accent/70 group-hover:bg-cinema-accent group-hover:shadow-glow" />
              {movie.releaseYear}
            </span>
          </div>
          {isSeries && movie.episodes && (
            <p className="text-[11px] text-cinema-silver mt-1">{movie.episodes} episodios</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export const MovieCard = memo(MovieCardBase);
