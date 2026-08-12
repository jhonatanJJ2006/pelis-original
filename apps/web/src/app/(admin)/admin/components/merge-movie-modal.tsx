'use client';

import { useMutation, useQuery } from '@pelis/db/client';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db';
import { Button, Input, Spinner } from '@pelis/ui/components';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { getAdminMovieDisplayName } from '../lib/movie-display';
import type { MediaItem } from '@pelis/ui/types';

interface MergeMovieModalProps {
  source: MediaItem & {
    quality?: {
      isOrphanId: boolean;
      isMissingImage: boolean;
      isMissingVideo: boolean;
      isIncomplete: boolean;
    };
  };
  onClose: () => void;
  onMerged: () => void;
}

export function MergeMovieModal({ source, onClose, onMerged }: MergeMovieModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const mergeMovies = useMutation(api.adminMovies.merge);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const targets = useQuery(
    api.adminMovies.adminSearchTargets,
    debouncedQuery.length >= 2
      ? { q: debouncedQuery, excludeId: source._id as any }
      : 'skip'
  ) as MediaItem[] | undefined;

  const selectedTarget = targets?.find((movie) => movie._id === selectedTargetId);

  const handleMerge = async () => {
    if (!selectedTargetId) return;

    setIsMerging(true);
    try {
      await mergeMovies({
        sourceId: source._id as any,
        targetId: selectedTargetId as any,
      });
      toast.success('Películas fusionadas correctamente');
      onMerged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al fusionar');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        className="w-full max-w-2xl bg-cinema-surface border border-cinema-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-border">
          <h2 id="merge-modal-title" className="text-lg font-semibold text-white">
            Enlazar película
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-cinema-ash hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-cinema-muted mb-3">
              Registro fuente (se eliminará tras fusionar):
            </p>
            <div className="flex gap-4 p-4 rounded-xl bg-cinema-elevated/60 border border-cinema-border">
              <div className="w-16 h-24 shrink-0 rounded overflow-hidden">
                <MoviePoster src={source.image} alt={getAdminMovieDisplayName(source)} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{getAdminMovieDisplayName(source)}</p>
                <p className="text-xs text-cinema-ash mt-1">
                  {source.genre}
                  {source.releaseYear ? ` · ${source.releaseYear}` : ''}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {source.quality?.isOrphanId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                      ID huérfano
                    </span>
                  )}
                  {source.quality?.isMissingImage && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                      Sin imagen
                    </span>
                  )}
                  {source.videoUrl && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      Tiene video
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-cinema-muted mb-3">
              Buscar película destino (conservará metadata):
            </p>
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedTargetId(null);
              }}
              placeholder="Buscar por nombre o token..."
              iconLeft={<Search className="w-4 h-4" />}
            />

            {debouncedQuery.length >= 2 && targets === undefined && (
              <div className="flex justify-center py-6">
                <Spinner size="sm" />
              </div>
            )}

            {targets && targets.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-cinema-border divide-y divide-cinema-border">
                {targets.map((movie) => (
                  <button
                    key={movie._id}
                    type="button"
                    onClick={() => setSelectedTargetId(movie._id)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      selectedTargetId === movie._id
                        ? 'bg-cinema-violet/20'
                        : 'hover:bg-cinema-elevated/50'
                    }`}
                  >
                    <div className="w-10 h-14 shrink-0 rounded overflow-hidden">
                      <MoviePoster
                        src={movie.image}
                        alt={getAdminMovieDisplayName(movie)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {getAdminMovieDisplayName(movie)}
                      </p>
                      <p className="text-xs text-cinema-ash">{movie.releaseYear} · {movie.genre}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTarget && (
            <div className="p-4 rounded-xl border border-cinema-violet/30 bg-cinema-violet/10">
              <p className="text-xs text-cinema-violet-light mb-2">Destino seleccionado</p>
              <p className="font-medium text-white">{getAdminMovieDisplayName(selectedTarget)}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-cinema-border bg-cinema-elevated/30">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleMerge}
            disabled={!selectedTargetId || isMerging}
          >
            {isMerging ? 'Fusionando...' : 'Confirmar fusión'}
          </Button>
        </div>
      </div>
    </div>
  );
}
