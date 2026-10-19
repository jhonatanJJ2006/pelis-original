'use client';

import { useQueryResult, useMutation } from '@pelis/db/client';
import Link from 'next/link';
import { useState } from 'react';
import { History, Play, Trash2, X } from 'lucide-react';
import { Paginator } from '@pelis/ui/features/paginator';

const HISTORY_PAGE_SIZE = 24;
import { api } from '@pelis/db/api';
import { useUser } from '@pelis/auth/hooks';
import { ContinueWatchingRowSkeleton } from '@pelis/ui/features/continue-watching-row';
import { EmptyState, ErrorState } from '@pelis/ui/features/empty-state';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { formatDate, formatDuration, getProgressPercentage } from '@pelis/ui/utils';
import { toast } from 'sonner';

interface HistoryItem {
  _id: string;
  userId: string;
  movieId: string;
  progress: number;
  duration: number;
  lastWatched: number;
  movie: {
    _id: string;
    name: string;
    image: string;
    genre: string;
    mediaType?: 'movie' | 'series';
  } | null;
}

export default function HistoryPage() {
  const { user } = useUser();
  const removeHistory = useMutation(api.history.remove);
  const clearAll = useMutation(api.history.clearAll);

  const [page, setPage] = useState(1);
  const {
    data: historyPage,
    error: historyError,
    isLoading: historyLoading,
    refetch,
  } = useQueryResult<{ items: HistoryItem[]; total: number }>(
    api.history.listByUserPage,
    user
      ? {
          userId: user._id as any,
          limit: HISTORY_PAGE_SIZE,
          offset: (page - 1) * HISTORY_PAGE_SIZE,
        }
      : 'skip'
  );
  const { data: continueData } = useQueryResult<HistoryItem[]>(
    api.history.getContinueWatching,
    user ? { userId: user._id as any, limit: 12 } : 'skip'
  );
  const history = historyPage?.items;
  const total = historyPage?.total ?? 0;
  const continueItems = page === 1 ? (continueData ?? []) : [];

  const handleRemove = async (movieId: string) => {
    if (!user) return;
    try {
      await removeHistory({ userId: user._id as any, movieId: movieId as any });
      toast.success('Eliminado del historial');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    try {
      await clearAll({ userId: user._id as any });
      toast.success('Historial limpiado');
    } catch {
      toast.error('No se pudo limpiar el historial');
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={History}
        title="Inicia sesión"
        description="Tu historial de visionado aparecerá aquí cuando empieces a ver contenido."
        actionLabel="Iniciar sesión"
        actionHref="/login"
      />
    );
  }

  const isLoading = historyLoading;

  const recentItems = history ?? [];

  return (
    <div className="page-shell">
      <ScrollReveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-8 border-b border-cinema-border/60">
        <div className="max-w-2xl">
          <nav
            aria-label="Ruta"
            className="text-[11px] uppercase tracking-[0.16em] text-cinema-silver mb-3"
          >
            <Link href="/profile" className="hover:text-cinema-chalk">
              Mi cuenta
            </Link>{' '}
            / <span className="text-cinema-chalk">Historial</span>
          </nav>
          <p className="text-label uppercase text-cinema-accent mb-2 inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
            Actividad de visionado
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk">
            Historial de reproducción
          </h1>
          <p className="text-cinema-muted mt-3">
            Retoma tus películas y series exactamente donde las dejaste.{' '}
            <span className="text-cinema-silver">{total} títulos en tu historial.</span>
          </p>
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 self-start md:self-auto border border-cinema-danger-light/50 bg-cinema-danger/20 px-4 py-2 text-sm text-red-200 hover:bg-cinema-danger/35 transition-colors rounded-[2px]"
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            Borrar historial completo
          </button>
        )}
      </ScrollReveal>

      {isLoading && !historyPage ? (
        <div className="space-y-12">
          <ContinueWatchingRowSkeleton />
          <ContinueWatchingRowSkeleton count={6} />
        </div>
      ) : historyError && !history ? (
        <ErrorState
          title="No se pudo cargar el historial"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={refetch}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={History}
          title="Sin historial todavía"
          description="Reproduce una película o serie y aparecerá aquí para retomarla cuando quieras."
          actionLabel="Explorar catálogo"
          actionHref="/movies"
        />
      ) : (
        <div className="space-y-12">
          {continueItems.length > 0 && (
            <section>
              <h2 className="flex items-center gap-3 font-display text-2xl tracking-tight text-cinema-chalk mb-5">
                <span aria-hidden className="h-6 w-[3px] bg-cinema-accent" />
                Seguir viendo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {continueItems.map((item) => (
                  <HistoryCard
                    key={item.movieId}
                    item={item}
                    onRemove={() => handleRemove(item.movieId)}
                    resume
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="flex items-center gap-3 font-display text-2xl tracking-tight text-cinema-chalk mb-5">
              <span aria-hidden className="h-6 w-[3px] bg-cinema-accent" />
              Todo tu historial
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {recentItems.map((item) => (
                <HistoryCard
                  key={item.movieId}
                  item={item}
                  onRemove={() => handleRemove(item.movieId)}
                />
              ))}
            </div>
            <Paginator
              page={page}
              total={total}
              pageSize={HISTORY_PAGE_SIZE}
              onPageChange={setPage}
            />
          </section>
        </div>
      )}
    </div>
  );
}

function HistoryCard({
  item,
  onRemove,
  resume = false,
}: {
  item: HistoryItem;
  onRemove: () => void;
  resume?: boolean;
}) {
  const pct = getProgressPercentage(item.progress, item.duration);

  const href = `/movies/${item.movieId}${resume ? '?play=true' : ''}`;
  const remaining = item.duration > 0 ? Math.max(item.duration - item.progress, 0) : 0;

  return (
    <div className="bg-cinema-surface border border-cinema-border/70 overflow-hidden hover:border-cinema-accent/50 motion-safe:transition-[border-color] motion-safe:duration-normal h-full flex flex-col group rounded-[2px]">
      <Link href={href} className="relative aspect-video block overflow-hidden">
        {item.movie ? (
          <MoviePoster
            src={(item.movie as { backdropImage?: string }).backdropImage ?? item.movie.image}
            alt={item.movie.name}
            className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-normal [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-cinema-elevated flex items-center justify-center">
            <History className="w-8 h-8 text-cinema-ash" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg/70 to-transparent" />
        {item.duration > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-cinema-bg/70">
            <div className="h-full bg-cinema-accent" style={{ width: `${pct}%` }} />
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em] text-cinema-silver mb-1.5">
          <span className="truncate">
            {item.movie?.mediaType === 'series' ? 'Serie' : 'Película'}
            {item.movie?.genre ? ` · ${item.movie.genre}` : ''}
          </span>
          <span className="shrink-0 normal-case tracking-normal">
            {formatDate(item.lastWatched)}
          </span>
        </div>
        <Link
          href={href}
          className="font-display text-xl text-cinema-chalk hover:text-cinema-accent-light transition-colors truncate block"
        >
          {item.movie?.name ?? 'Título eliminado'}
        </Link>
        {item.duration > 0 && (
          <p className="text-sm text-cinema-muted mt-1">
            {pct >= 95 ? 'Completado' : `Quedan ${formatDuration(remaining)} · ${pct}% visto`}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between">
          <Link
            href={`/movies/${item.movieId}?play=true`}
            className="inline-flex items-center gap-1.5 bg-cinema-accent px-3 py-1.5 text-xs font-semibold text-cinema-bg hover:bg-cinema-accent-light transition-colors rounded-[2px]"
          >
            <Play className="w-3.5 h-3.5" fill="currentColor" aria-hidden />
            {pct > 0 && pct < 95 ? 'Continuar' : 'Reproducir'}
          </Link>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-cinema-ash hover:text-cinema-danger-light hover:bg-cinema-danger/10 shrink-0 rounded"
            aria-label="Eliminar del historial"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
