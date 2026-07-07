'use client';

import { useQuery, useMutation } from 'convex/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Heart, Film, Tv } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { Spinner, Button } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { toast } from 'sonner';
import type { MediaItem } from '@pelis/ui/types';

type Tab = 'all' | 'movies' | 'series';

export default function FavoritesPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>('all');
  const removeFavorite = useMutation(api.favorites.remove);

  const movies = (useQuery(
    api.favorites.listByUser,
    user ? { userId: user._id as any } : 'skip'
  ) as MediaItem[] | undefined);

  const filtered = useMemo(() => {
    const list = movies ?? [];
    if (tab === 'movies') return list.filter((m) => (m.mediaType ?? 'movie') !== 'series');
    if (tab === 'series') return list.filter((m) => m.mediaType === 'series');
    return list;
  }, [movies, tab]);

  const seriesCount = (movies ?? []).filter((m) => m.mediaType === 'series').length;
  const moviesCount = (movies ?? []).filter((m) => (m.mediaType ?? 'movie') !== 'series').length;

  const handleRemove = async (movieId: string) => {
    if (!user) return;
    try {
      await removeFavorite({ userId: user._id as any, movieId: movieId as any });
      toast.success('Eliminado de favoritos');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={Heart}
        title="Inicia sesión"
        description="Guarda películas y series para verlas cuando quieras."
        actionLabel="Iniciar sesión"
        actionHref="/login"
      />
    );
  }

  const isLoading = movies === undefined;

  return (
    <div className="page-shell">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-cinema-gold text-sm font-medium uppercase tracking-widest mb-2">
            Tu lista
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase">
            Favoritos
          </h1>
          <p className="text-zinc-400 mt-2">
            {(movies ?? []).length} títulos guardados
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-cinema-surface border border-cinema-border rounded-xl">
          {([
            { id: 'all' as Tab, label: 'Todo', count: movies?.length ?? 0 },
            { id: 'movies' as Tab, label: 'Películas', count: moviesCount },
            { id: 'series' as Tab, label: 'Series', count: seriesCount },
          ]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === item.id
                  ? 'bg-cinema-accent text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={tab === 'series' ? Tv : tab === 'movies' ? Film : Heart}
          title={
            tab === 'series'
              ? 'Sin series favoritas'
              : tab === 'movies'
                ? 'Sin películas favoritas'
                : 'Tu lista está vacía'
          }
          description="Explora el catálogo y pulsa el corazón en cualquier título."
          actionLabel={tab === 'series' ? 'Ver series' : 'Explorar catálogo'}
          actionHref={tab === 'series' ? '/series' : '/movies'}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((movie) => (
            <div key={movie._id} className="relative group/item">
              <MovieCard movie={movie} />
              <button
                type="button"
                onClick={() => handleRemove(movie._id)}
                className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/70 text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-500/20"
                aria-label="Quitar de favoritos"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
