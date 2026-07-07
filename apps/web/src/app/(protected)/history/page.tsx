'use client';

import { useQuery, useMutation } from 'convex/react';
import Link from 'next/link';
import { History, Play, Trash2 } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { Spinner, Button } from '@pelis/ui/components';
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

  const history = useQuery(
    api.history.listByUser,
    user ? { userId: user._id as any } : 'skip'
  ) as HistoryItem[] | undefined;

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

  return (
    <div className="page-shell">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-cinema-gold text-sm font-medium uppercase tracking-widest mb-2">
            Actividad
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase">
            Historial
          </h1>
          <p className="text-zinc-400 mt-2">{history?.length ?? 0} títulos en tu historial</p>
        </div>
        {(history?.length ?? 0) > 0 && (
          <Button variant="outline" onClick={handleClearAll}>
            Limpiar todo
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
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
              <h2 className="font-display text-2xl tracking-wide text-white uppercase mb-5">
                Continuar viendo
              </h2>
              <div className="space-y-3">
                {continueItems.map((item) => (
                  <HistoryRow
                    key={item._id}
                    item={item}
                    onRemove={() => handleRemove(item.movieId)}
                    resume
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl tracking-wide text-white uppercase mb-5">
              {continueItems.length > 0 ? 'Visto recientemente' : 'Todo tu historial'}
            </h2>
            <div className="space-y-3">
              {(continueItems.length > 0 ? completedItems.concat(
                (history ?? []).filter((h) => !continueItems.includes(h) && !completedItems.includes(h))
              ) : history ?? []).map((item) => (
                <HistoryRow
                  key={item._id}
                  item={item}
                  onRemove={() => handleRemove(item.movieId)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function HistoryRow({
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
    <div className="flex items-center gap-4 bg-cinema-surface rounded-2xl border border-cinema-border p-4 hover:border-cinema-accent/30 transition-all group">
      <Link href={`/movies/${item.movieId}${resume ? '?play=true' : ''}`} className="shrink-0">
        {item.movie ? (
          <img
            src={item.movie.image}
            alt={item.movie.name}
            className="w-20 h-28 md:w-24 md:h-32 rounded-xl object-cover"
          />
        ) : (
          <div className="w-20 h-28 rounded-xl bg-cinema-elevated flex items-center justify-center">
            <History className="w-6 h-6 text-zinc-600" />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={`/movies/${item.movieId}${resume ? '?play=true' : ''}`}
              className="font-medium text-lg hover:text-cinema-gold transition-colors truncate block"
            >
              {item.movie?.name ?? 'Título eliminado'}
            </Link>
            <p className="text-sm text-zinc-500 mt-1">
              {item.movie?.genre}
              {item.movie?.mediaType === 'series' && ' · Serie'}
              {' · '}
              {formatDate(item.lastWatched)}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
            aria-label="Eliminar del historial"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {item.duration > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span>{formatDuration(item.progress)}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-cinema-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-cinema-accent rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {resume && (
          <Link href={`/movies/${item.movieId}?play=true`}>
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cinema-gold hover:text-cinema-gold-light transition-colors">
              <Play className="w-4 h-4" fill="currentColor" />
              Reanudar reproducción
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
