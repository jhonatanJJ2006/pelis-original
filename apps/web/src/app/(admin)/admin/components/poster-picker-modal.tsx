'use client';

import { useAction } from 'convex/react';
import { useEffect, useState } from 'react';
import { ArrowRight, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { Button, Spinner } from '@pelis/ui/components';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { getAdminMovieDisplayName } from '../lib/movie-display';
import { cn } from '@pelis/ui/utils';

interface PosterPickerModalProps {
  movie: {
    _id: string;
    name: string;
    token: string;
    image: string;
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
      status: 'nothing_to_fill';
      movie: { id: string; name: string };
    }
  | {
      status: 'ok';
      movie: { id: string; name: string; token: string; image: string };
      tmdb: {
        tmdbId: number;
        title: string;
        originalTitle: string;
        releaseYear: string;
        posterUrl: string | null;
      };
      hasExistingImage: boolean;
    };

export function PosterPickerModal({ movie, onClose, onApplied }: PosterPickerModalProps) {
  const previewMetadata = useAction(api.adminEnrichment.previewMetadata);
  const enrichMovie = useAction(api.adminEnrichment.enrichMovie);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      try {
        const result = await previewMetadata({ movieId: movie._id as any });
        if (!cancelled) setPreview(result as PreviewResult);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : 'Error al buscar poster en TMDB'
          );
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
  }, [movie._id, onClose, previewMetadata]);

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
    if (!preview || preview.status !== 'ok' || !preview.tmdb.posterUrl) return;

    setConfirming(true);
    try {
      const result = await enrichMovie({
        movieId: movie._id as any,
        tmdbId: preview.tmdb.tmdbId,
        replaceImage: true,
      });

      if (result.updated) {
        toast.success('Poster actualizado');
      } else {
        toast.info('No se pudo aplicar el poster');
      }
      onApplied();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al aplicar poster');
    } finally {
      setConfirming(false);
    }
  };

  const displayName = getAdminMovieDisplayName(movie);
  const canApply = preview?.status === 'ok' && !!preview.tmdb.posterUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-cinema-surface border border-cinema-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="poster-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-border shrink-0">
          <h2
            id="poster-picker-title"
            className="text-lg font-semibold text-white flex items-center gap-2"
          >
            <ImageIcon className="w-5 h-5 text-cinema-violet-light" />
            Poster TMDB
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-cinema-muted hover:text-white hover:bg-cinema-elevated transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          <p className="text-sm text-cinema-muted mb-1">Película local</p>
          <p className="text-white font-medium mb-4">{displayName}</p>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : preview?.status === 'not_found' ? (
            <p className="text-cinema-muted py-8 text-center">
              TMDB no encontró resultados para &quot;{preview.searchQuery}&quot;.
            </p>
          ) : preview?.status === 'nothing_to_fill' ? (
            <p className="text-cinema-muted py-8 text-center">
              TMDB no tiene poster disponible para esta película.
            </p>
          ) : preview?.status === 'ok' ? (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">{preview.tmdb.title}</h3>
                {preview.tmdb.originalTitle !== preview.tmdb.title && (
                  <p className="text-sm text-cinema-muted mt-0.5">{preview.tmdb.originalTitle}</p>
                )}
                {preview.tmdb.releaseYear && (
                  <p className="text-sm text-cinema-gold mt-1">{preview.tmdb.releaseYear}</p>
                )}
              </div>

              <div className="rounded-xl border border-cinema-border bg-cinema-elevated/40 p-4">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="text-center">
                    <p className="text-xs text-cinema-muted mb-2">Actual</p>
                    <div
                      className={cn(
                        'w-28 h-40 rounded-lg overflow-hidden bg-cinema-elevated border',
                        preview.hasExistingImage ? 'border-cinema-border' : 'border-dashed border-cinema-border'
                      )}
                    >
                      {preview.hasExistingImage ? (
                        <MoviePoster
                          src={preview.movie.image || movie.image}
                          alt="Poster actual"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-cinema-muted px-2">
                          Sin poster
                        </div>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-cinema-muted shrink-0" />

                  <div className="text-center">
                    <p className="text-xs text-cinema-muted mb-2">TMDB</p>
                    <div className="w-28 h-40 rounded-lg overflow-hidden bg-cinema-elevated border border-cinema-violet/30">
                      {preview.tmdb.posterUrl ? (
                        <MoviePoster
                          src={preview.tmdb.posterUrl}
                          alt={preview.tmdb.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-cinema-muted">
                          Sin poster
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {!preview.tmdb.posterUrl && (
                <p className="text-sm text-cinema-muted text-center">
                  Esta ficha en TMDB no incluye imagen de poster.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cinema-border shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            Cancelar
          </Button>
          {canApply && (
            <Button onClick={handleApply} disabled={confirming || loading}>
              {confirming ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Aplicando...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  {preview.hasExistingImage ? 'Reemplazar poster' : 'Usar este poster'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
