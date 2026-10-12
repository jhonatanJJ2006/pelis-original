'use client';

import { useAction } from '@pelis/db/client';
import { useEffect, useState } from 'react';
import { ArrowRight, Monitor, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { Button, Spinner } from '@pelis/ui/components';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { getAdminMovieDisplayName } from '../lib/movie-display';
import { cn } from '@pelis/ui/utils';

interface BackdropPickerModalProps {
  movie: {
    _id: string;
    name: string;
    token: string;
    image: string;
    backdropImage?: string;
  };
  onClose: () => void;
  onApplied: () => void;
}

type PreviewResult =
  | {
      status: 'not_found';
      movie: { id: string; name: string };
      searchQuery: string;
    }
  | {
      status: 'no_backdrop';
      movie: { id: string; name: string };
      tmdb: {
        tmdbId: number;
        title: string;
        originalTitle: string;
        releaseYear: string;
      };
    }
  | {
      status: 'ok';
      movie: {
        id: string;
        name: string;
        token: string;
        image: string;
        backdropImage?: string;
      };
      tmdb: {
        tmdbId: number;
        title: string;
        originalTitle: string;
        releaseYear: string;
        backdropUrl: string | null;
      };
      hasExistingBackdrop: boolean;
    };

export function BackdropPickerModal({ movie, onClose, onApplied }: BackdropPickerModalProps) {
  const previewBackdrop = useAction<{ movieId: string; tmdbId?: number }, any>(
    api.adminEnrichment.previewBackdrop
  );
  const applyBackdrop = useAction<
    { movieId: string; tmdbId: number; replaceBackdrop?: boolean },
    any
  >(api.adminEnrichment.applyBackdrop);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      try {
        const result = await previewBackdrop({ movieId: movie._id as any });
        if (!cancelled) setPreview(result as PreviewResult);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Error al buscar backdrop en TMDB');
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [movie._id, onClose, previewBackdrop]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleApply = async () => {
    if (!preview || preview.status !== 'ok' || !preview.tmdb.backdropUrl) return;

    setConfirming(true);
    try {
      const result = await applyBackdrop({
        movieId: movie._id as any,
        tmdbId: preview.tmdb.tmdbId,
        replaceBackdrop: preview.hasExistingBackdrop,
      });

      if (result.updated) {
        toast.success('Backdrop actualizado');
      } else {
        toast.info('No se pudo aplicar el backdrop');
      }
      onApplied();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al aplicar backdrop');
    } finally {
      setConfirming(false);
    }
  };

  const displayName = getAdminMovieDisplayName(movie);
  const canApply = preview?.status === 'ok' && !!preview.tmdb.backdropUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg sm:max-w-2xl bg-cinema-surface border border-cinema-border rounded-[2px] sm:rounded-[2px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backdrop-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-border shrink-0">
          <h2
            id="backdrop-picker-title"
            className="text-lg font-semibold text-cinema-chalk flex items-center gap-2"
          >
            <Monitor className="w-5 h-5 text-cyan-400" />
            Backdrop TMDB
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-[2px] text-cinema-muted hover:text-cinema-chalk hover:bg-cinema-elevated transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          <p className="text-sm text-cinema-muted mb-1">Película local</p>
          <p className="text-cinema-chalk font-medium mb-4">{displayName}</p>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : preview?.status === 'not_found' ? (
            <p className="text-cinema-muted py-8 text-center">
              TMDB no encontró resultados para &quot;{preview.searchQuery}&quot;.
            </p>
          ) : preview?.status === 'no_backdrop' ? (
            <p className="text-cinema-muted py-8 text-center">
              TMDB encontró &quot;{preview.tmdb.title}&quot; pero no tiene imagen ancha disponible.
            </p>
          ) : preview?.status === 'ok' ? (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-cinema-chalk">{preview.tmdb.title}</h3>
                {preview.tmdb.originalTitle !== preview.tmdb.title && (
                  <p className="text-sm text-cinema-muted mt-0.5">{preview.tmdb.originalTitle}</p>
                )}
                {preview.tmdb.releaseYear && (
                  <p className="text-sm text-cinema-accent mt-1">{preview.tmdb.releaseYear}</p>
                )}
              </div>

              <div className="rounded-[2px] border border-cinema-border bg-cinema-elevated/40 p-4 space-y-4">
                <div>
                  <p className="text-xs text-cinema-muted mb-2">Actual (hero / reproductor)</p>
                  <div
                    className={cn(
                      'w-full aspect-video max-h-36 rounded-[2px] overflow-hidden bg-cinema-elevated border',
                      preview.hasExistingBackdrop
                        ? 'border-cinema-border'
                        : 'border-dashed border-cinema-border'
                    )}
                  >
                    {preview.hasExistingBackdrop ? (
                      <MoviePoster
                        src={preview.movie.backdropImage ?? movie.backdropImage ?? ''}
                        alt="Backdrop actual"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-cinema-muted">
                        Usa el poster vertical como fallback
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-cinema-muted rotate-90" />
                </div>

                <div>
                  <p className="text-xs text-cinema-muted mb-2">TMDB (imagen ancha)</p>
                  <div className="w-full aspect-video rounded-[2px] overflow-hidden bg-cinema-elevated border border-cyan-500/30">
                    {preview.tmdb.backdropUrl ? (
                      <MoviePoster
                        src={preview.tmdb.backdropUrl}
                        alt={preview.tmdb.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-cinema-muted">
                        Sin backdrop
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cinema-border shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            Cancelar
          </Button>
          {canApply && preview.status === 'ok' && (
            <Button onClick={handleApply} disabled={confirming || loading}>
              {confirming ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4" />
                  {preview.hasExistingBackdrop ? 'Reemplazar backdrop' : 'Usar este backdrop'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
