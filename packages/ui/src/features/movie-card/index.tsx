'use client';

import Link from 'next/link';
import { Heart, Play, Tv } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { useUser } from '@pelis/auth/hooks';
import { api } from '@pelis/convex';
import { toast } from 'sonner';
import { Badge } from '../../shared/ui/badge';
import { cn } from '../../shared/utils';
import type { MediaItem } from '../../shared/types';

interface MovieCardProps {
  movie: MediaItem;
  showFavorite?: boolean;
  variant?: 'poster' | 'compact';
}

export function MovieCard({ movie, showFavorite = true, variant = 'poster' }: MovieCardProps) {
  const { user } = useUser();
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);
  const isSeries = movie.mediaType === 'series';

  const isFavorited = useQuery(
    api.favorites.check,
    user ? { userId: user._id as any, movieId: movie._id as any } : 'skip'
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
    <Link href={`/movies/${movie._id}`} className="group block">
      <div
        className={cn(
          'rounded-xl overflow-hidden transition-all duration-300',
          'bg-cinema-surface border border-cinema-border',
          'hover:border-cinema-accent/40 hover:shadow-xl hover:shadow-cinema-accent/5',
          'group-hover:-translate-y-1'
        )}
      >
        <div className={cn('relative overflow-hidden', variant === 'poster' ? 'aspect-[2/3]' : 'aspect-video')}>
          <img
            src={movie.image}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center gap-3 translate-y-2 group-hover:translate-y-0 transition-transform">
              <div className="p-3 rounded-full bg-cinema-accent text-white shadow-lg shadow-cinema-accent/30">
                <Play className="w-5 h-5" fill="currentColor" />
              </div>
              {showFavorite && (
                <button
                  type="button"
                  onClick={handleFavorite}
                  className={cn(
                    'p-3 rounded-full transition-all',
                    isFavorited
                      ? 'bg-red-600 text-white'
                      : 'bg-black/60 text-white hover:bg-black/80 border border-white/20'
                  )}
                  aria-label={isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={cn('w-5 h-5', isFavorited && 'fill-current')} />
                </button>
              )}
            </div>
          </div>
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            {isSeries && (
              <Badge className="text-[10px] bg-cinema-gold/90 text-black border-0 gap-1">
                <Tv className="w-3 h-3" />
                Serie
              </Badge>
            )}
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="primary" className="text-[10px] bg-black/60 backdrop-blur-sm border-white/10">
              {movie.classification}
            </Badge>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate mb-1 group-hover:text-cinema-gold transition-colors">
            {movie.name}
          </h3>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="truncate">{movie.genre}</span>
            <span className="shrink-0 ml-2">{movie.releaseYear}</span>
          </div>
          {isSeries && movie.episodes && (
            <p className="text-[11px] text-zinc-600 mt-1">{movie.episodes} episodios</p>
          )}
        </div>
      </div>
    </Link>
  );
}
