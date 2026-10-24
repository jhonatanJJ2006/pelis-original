'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Heart, Play, Tv, Film, TrendingUp } from 'lucide-react';
import { useMutation, useQuery } from '@pelis/db/client';
import { useUser } from '@pelis/auth/hooks';
import { api } from '@pelis/db/api';
import { toast } from 'sonner';
import { Badge } from '../../shared/ui/badge';
import { MoviePoster } from '../movie-poster';
import { cn } from '../../shared/utils';
import type { MediaItem } from '../../shared/types';

interface MovieCardProps {
  movie: MediaItem;
  showFavorite?: boolean;
  variant?: 'poster' | 'compact';
  posterLoading?: 'lazy' | 'eager';
  posterFetchPriority?: 'high' | 'low' | 'auto';
  /** Avisa al hero de inicio cuando el ratón o el teclado se posan en la tarjeta. */
  onPreview?: () => void;
  /** Anillo dorado de la tarjeta que ahora manda el hero. */
  active?: boolean;
}

function MovieCardBase({
  movie,
  showFavorite = true,
  variant = 'poster',
  posterLoading = 'lazy',
  posterFetchPriority,
  onPreview,
  active = false,
}: MovieCardProps) {
  const { user } = useUser();
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);
  const isSeries = movie.mediaType === 'series';

  const isFavorited = useQuery<boolean>(
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
      onMouseEnter={onPreview}
      onFocus={onPreview}
      className="card-container block group active:scale-[0.97] motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-expo rounded-[2px] focus-visible:outline-none"
    >
      <div
        className={cn(
          'rounded-card overflow-hidden',
          'bg-cinema-surface border border-cinema-border',
          'motion-safe:transition-[transform,border-color,box-shadow] relative z-0 hover:z-10 motion-safe:duration-normal motion-safe:ease-out-expo',
          '[@media(hover:hover)_and_(pointer:fine)]:group-hover:border-cinema-accent',
          '[@media(hover:hover)_and_(pointer:fine)]:group-hover:ring-2 [@media(hover:hover)_and_(pointer:fine)]:group-hover:ring-cinema-accent',
          '[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]',
          'group-focus-visible:ring-2 group-focus-visible:ring-cinema-accent',
          active && 'ring-2 ring-cinema-accent border-cinema-accent'
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
            loading={posterLoading}
            fetchPriority={posterFetchPriority}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg/95 via-cinema-bg/30 to-transparent opacity-70 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-90 motion-safe:transition-opacity motion-safe:duration-normal z-[1]" />
          <div className="card-media-scrim absolute inset-0 z-[2]" aria-hidden />

          <div className="card-actions-layer absolute inset-0 z-[3] flex items-center justify-center">
            <div className="card-actions-toolbar flex items-center gap-3">
              <div
                className="card-action-btn card-action-btn--play p-3 rounded-full bg-cinema-accent text-cinema-bg shadow-glow"
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
                      ? 'bg-cinema-accent text-cinema-bg shadow-glow'
                      : 'bg-cinema-elevated/90 text-cinema-chalk hover:bg-cinema-accent/20 border border-cinema-border'
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
              <Badge className="text-[10px] bg-cinema-accent text-cinema-bg border-0 gap-1">
                <Tv className="w-3 h-3" />
                Serie
              </Badge>
            ) : (
              <Badge variant="primary" className="text-[10px] gap-1">
                <Film className="w-3 h-3" />
                Película
              </Badge>
            )}
            {movie.comingSoon && (
              <Badge className="text-[10px] bg-cinema-bg/85 text-cinema-accent-light border border-cinema-accent/40">
                Próximamente
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
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-cinema-silver mb-1">
            <span className="truncate">{movie.genre}</span>
            <span aria-hidden>•</span>
            <span className="shrink-0">{movie.releaseYear}</span>
          </div>
          <h3 className="font-display text-[15px] text-cinema-chalk truncate transition-colors duration-200 group-hover:text-cinema-accent-light">
            {movie.name}
          </h3>
          {isSeries && movie.episodes && (
            <p className="text-[11px] text-cinema-silver mt-1">{movie.episodes} episodios</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export const MovieCard = memo(MovieCardBase);
export { MovieGridSkeleton } from './movie-grid-skeleton';
