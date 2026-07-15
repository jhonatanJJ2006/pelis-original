'use client';

import { useQuery, useMutation } from 'convex/react';
import { useMemo, useState } from 'react';
import { Heart, Film, Tv } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { MovieSwiper } from '@pelis/ui/features/movie-swiper';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { Spinner } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { toast } from 'sonner';
import type { MediaItem } from '@pelis/ui/types';

type Tab = 'all' | 'movies' | 'series';

export default function FavoritesPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>('all');
  const removeFavorite = useMutation(api.favorites.remove);

  const movies = useQuery(
    api.favorites.listByUser,
    user ? { userId: user._id as any } : 'skip'
  ) as MediaItem[] | undefined;

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
      <ScrollReveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
            Tu lista
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase">
            Favoritos
          </h1>
          <p className="text-cinema-muted mt-2">{(movies ?? []).length} títulos guardados</p>
        </div>

        <div
          className="flex gap-2 p-1 bg-cinema-surface border border-cinema-border rounded-xl overflow-x-auto"
          role="tablist"
          aria-label="Filtrar favoritos"
        >
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
                'px-4 py-2 rounded-lg text-sm font-medium motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-fast',
                tab === item.id
                  ? 'bg-cinema-violet text-white shadow-glow-violet'
                  : 'text-cinema-silver hover:text-white hover:bg-cinema-elevated/50'
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </ScrollReveal>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" role="status" aria-label="Cargando">
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
        <ScrollReveal>
          <MovieSwiper
            movies={filtered}
            slideWidth="lg"
            renderSlide={(movie) => (
              <div className="relative group/item">
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
            )}
          />
        </ScrollReveal>
      )}
    </div>
  );
}
