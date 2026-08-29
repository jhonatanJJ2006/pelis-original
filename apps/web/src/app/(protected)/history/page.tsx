'use client';

import { useQuery, useMutation } from '@pelis/db/client';
import Link from 'next/link';
import { History, Play, Trash2 } from 'lucide-react';
import { api } from '@pelis/db/api';
import { useUser } from '@pelis/auth/hooks';
import { ContinueWatchingRowSkeleton } from '@pelis/ui/features/continue-watching-row';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { ContentSwiper } from '@pelis/ui/features/content-swiper';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { Button } from '@pelis/ui/components';
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

  const history = useQuery(api.history.listByUser, user ? { userId: user._id as any } : 'skip') as
    HistoryItem[] | undefined;

  const continueItems = (history ?? []).filter(
    (h) => h.duration > 0 && h.progress > 0 && h.progress < h.duration * 0.95
  );
  const completedItems = (history ?? []).filter(
    (h) => h.duration > 0 && h.progress >= h.duration * 0.95
  );

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

  const isLoading = history === undefined;

  const recentItems =
    continueItems.length > 0
      ? completedItems.concat(
          (history ?? []).filter((h) => !continueItems.includes(h) && !completedItems.includes(h))
        )
      : (history ?? []);

  return (
    <div className="page-shell">
      <ScrollReveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-cinema-accent text-sm font-medium uppercase tracking-widest mb-2">
            Actividad
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk">
            Historial
          </h1>
          <p className="text-cinema-muted mt-2">{history?.length ?? 0} títulos en tu historial</p>
        </div>
        {(history?.length ?? 0) > 0 && (
          <Button variant="outline" onClick={handleClearAll}>
            Limpiar todo
          </Button>
        )}
      </ScrollReveal>

      {isLoading ? (
        <div className="space-y-12">
          <ContinueWatchingRowSkeleton />
          <ContinueWatchingRowSkeleton count={6} />
        </div>
      ) : (history?.length ?? 0) === 0 ? (
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
              <h2 className="font-display text-2xl tracking-tight text-cinema-chalk mb-5">
                Continuar viendo
              </h2>
              <ContentSwiper slideClassName="!w-[320px] sm:!w-[360px]">
                {continueItems.map((item) => (
                  <HistoryCard
                    key={item._id}
                    item={item}
                    onRemove={() => handleRemove(item.movieId)}
                    resume
                  />
                ))}
              </ContentSwiper>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl tracking-tight text-cinema-chalk mb-5">
              {continueItems.length > 0 ? 'Visto recientemente' : 'Todo tu historial'}
            </h2>
            <ContentSwiper slideClassName="!w-[320px] sm:!w-[360px]">
              {recentItems.map((item) => (
                <HistoryCard
                  key={item._id}
                  item={item}
                  onRemove={() => handleRemove(item.movieId)}
                />
              ))}
            </ContentSwiper>
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

  return (
    <div className="bg-cinema-surface rounded-2xl border border-cinema-border overflow-hidden hover:border-cinema-accent/50 motion-safe:transition-[border-color,box-shadow] motion-safe:duration-normal h-full flex flex-col group">
      <Link
        href={`/movies/${item.movieId}${resume ? '?play=true' : ''}`}
        className="relative aspect-video block overflow-hidden"
      >
        {item.movie ? (
          <MoviePoster
            src={item.movie.image}
            alt=""
            className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-normal [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-cinema-elevated flex items-center justify-center">
            <History className="w-8 h-8 text-cinema-ash" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/40 to-transparent" />
        {resume && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 motion-safe:transition-opacity">
            <div className="p-3 rounded-full bg-cinema-accent text-cinema-bg shadow-glow">
              <Play className="w-5 h-5" fill="currentColor" />
            </div>
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <Link
              href={`/movies/${item.movieId}${resume ? '?play=true' : ''}`}
              className="font-medium hover:text-cinema-accent-light transition-colors truncate block"
            >
              {item.movie?.name ?? 'Título eliminado'}
            </Link>
            <p className="text-xs text-cinema-silver mt-1">
              {item.movie?.genre}
              {item.movie?.mediaType === 'series' && ' · Serie'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-cinema-ash hover:text-red-400 rounded-lg hover:bg-red-500/10 shrink-0"
            aria-label="Eliminar del historial"
          >
            <Trash2 className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <p className="text-xs text-cinema-ash mb-3">{formatDate(item.lastWatched)}</p>

        {item.duration > 0 && (
          <div className="mt-auto">
            <div className="flex items-center justify-between text-xs text-cinema-silver mb-1">
              <span>{formatDuration(item.progress)}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-cinema-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cinema-accent to-cinema-gold rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
