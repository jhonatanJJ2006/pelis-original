'use client';

import Link from 'next/link';
import { Heart, Play } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { useUser } from '@pelis/auth/hooks';
import { api } from '@pelis/convex';
import { toast } from 'sonner';
import { Badge } from '../../shared/ui/badge';
import { cn } from '../../shared/utils';

interface Movie {
  _id: string;
  name: string;
  image: string;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
}

interface MovieCardProps {
  movie: Movie;
  showFavorite?: boolean;
}

export function MovieCard({ movie, showFavorite = true }: MovieCardProps) {
  const { user } = useUser();
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.remove);

  const isFavorited = useQuery(
    api.favorites.check,
    user ? { userId: user._id as any, movieId: movie._id as any } : 'skip'
  );

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Inicia sesi&oacute;n para guardar favoritos');
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
    <Link href={`/movies/${movie._id}`} className="group">
      <div className="bg-dark-200 rounded-xl border border-slate-800 overflow-hidden transition-all duration-300 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 group-hover:scale-[1.02]">
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={movie.image}
            alt={movie.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-600/90 hover:bg-primary-500 p-3 rounded-full transition-all hover:scale-110">
                <Play className="w-5 h-5" fill="currentColor" />
              </div>
              {showFavorite && (
                <button
                  onClick={handleFavorite}
                  className={cn(
                    'p-3 rounded-full transition-all hover:scale-110',
                    isFavorited
                      ? 'bg-red-500/90 hover:bg-red-500 text-white'
                      : 'bg-dark-100/80 hover:bg-dark-100 text-white'
                  )}
                >
                  <Heart
                    className={cn('w-5 h-5', isFavorited && 'fill-current')}
                  />
                </button>
              )}
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="primary" className="text-xs">
              {movie.classification}
            </Badge>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate mb-1 group-hover:text-primary-400 transition-colors">
            {movie.name}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{movie.genre}</span>
            <span>{movie.releaseYear}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
