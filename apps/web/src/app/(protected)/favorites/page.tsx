'use client';

import { useQueryResult, useMutation } from '@pelis/db/client';
import { useMemo, useState } from 'react';
import { Heart, Film, Tv } from 'lucide-react';
import { api } from '@pelis/db/api';
import { useUser } from '@pelis/auth/hooks';
import { MovieGridSkeleton } from '@pelis/ui/features/movie-card';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { EmptyState, ErrorState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { cn } from '@pelis/ui/utils';
import { toast } from 'sonner';
import type { MediaItem } from '@pelis/ui/types';

type Tab = 'all' | 'movies' | 'series';

export default function FavoritesPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>('all');
  const removeFavorite = useMutation(api.favorites.remove);

  const {
    data: movies,
    error: moviesError,
    isLoading: moviesLoading,
    refetch,
  } = useQueryResult<MediaItem[]>(
    api.favorites.listByUser,
    user ? { userId: user._id as any } : 'skip'
  );

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

  const isLoading = moviesLoading;

  return (
    <div className="page-shell">
      <ScrollReveal className="pb-6 mb-6 border-b border-cinema-border/60">
        <span className="inline-block border border-cinema-accent/40 bg-cinema-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cinema-accent mb-3">
          Curaduría personal
        </span>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk">
          Mi lista{' '}
          <span className="italic text-cinema-accent text-2xl md:text-3xl">Maison Noir</span>
        </h1>
        <p className="text-cinema-muted mt-2">
          Colección personal: {(movies ?? []).length} títulos guardados.
        </p>
      </ScrollReveal>

      <ScrollReveal className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Filtrar favoritos">
          {(
            [
              { id: 'all' as Tab, label: 'Todo', count: movies?.length ?? 0 },
              { id: 'movies' as Tab, label: 'Películas', count: moviesCount },
              { id: 'series' as Tab, label: 'Series', count: seriesCount },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'px-4 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-fast',
                tab === item.id
                  ? 'bg-cinema-accent border-cinema-accent text-cinema-bg'
                  : 'border-cinema-border bg-cinema-surface text-cinema-silver hover:text-cinema-chalk'
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </ScrollReveal>

      {isLoading ? (
        <MovieGridSkeleton />
      ) : moviesError && !movies ? (
        <ErrorState
          title="No se pudieron cargar tus favoritos"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={refetch}
        />
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
        <ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((movie) => (
              <div key={movie._id} className="relative group/item">
                <MovieCard movie={movie} />
                <button
                  type="button"
                  onClick={() => handleRemove(movie._id)}
                  className="absolute top-2 right-2 z-20 p-2 rounded-full bg-cinema-elevated/95 text-cinema-accent opacity-100 md:opacity-0 md:group-hover/item:opacity-100 focus-visible:opacity-100 motion-safe:transition-opacity hover:bg-cinema-accent/20 border border-cinema-border active:scale-95"
                  aria-label="Quitar de favoritos"
                >
                  <Heart className="w-4 h-4 fill-current" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
