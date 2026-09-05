'use client';

import { useAction } from '@pelis/db/client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Monitor, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { Button, Spinner } from '@pelis/ui/components';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { getAdminMovieDisplayName } from '../lib/movie-display';
import { cn } from '@pelis/ui/utils';

const FIELD_LABELS: Record<string, string> = {
  synopsis: 'Sinopsis',
  genre: 'Género',
  actors: 'Actores',
  classification: 'Clasificación',
  releaseYear: 'Año',
  image: 'Poster',
  imageId: 'Poster',
};

interface EnrichMovieModalProps {
  movie: {
    _id: string;
    name: string;
    token: string;
    image: string;
    backdropImage?: string;
    quality?: {
      isOrphanId: boolean;
      isMissingImage: boolean;
      isMissingVideo: boolean;
      isIncomplete: boolean;
      isMissingBackdrop?: boolean;
    };
  };
  onClose: () => void;
  onEnriched: () => void;
}

type PreviewResult =
  | {
      status: 'nothing_to_fill';
      movie: { id: string; name: string };
    }
  | {
      status: 'not_found';
      movie: { id: string; name: string };
      searchQuery: string;
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
        synopsis: string;
        genre: string;
        actors: string;
        classification: string;
        releaseYear: string;
        posterUrl: string | null;
        backdropUrl: string | null;
      };
      willFill: Record<string, boolean>;
      fieldsToApply: string[];
      canReplaceImage: boolean;
      hasExistingImage: boolean;
      replaceImageDefault: boolean;
      canReplaceBackdrop: boolean;
      hasExistingBackdrop: boolean;
      replaceBackdropDefault: boolean;
    };

export function EnrichMovieModal({ movie, onClose, onEnriched }: EnrichMovieModalProps) {
  const previewMetadata = useAction<{ movieId: string; tmdbId?: number }, any>(
    api.adminEnrichment.previewMetadata
  );
  const enrichMovie = useAction<
    { movieId: string; tmdbId: number; replaceImage?: boolean; replaceBackdrop?: boolean },
    any
  >(api.adminEnrichment.enrichMovie);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [replaceImage, setReplaceImage] = useState(false);
  const [replaceBackdrop, setReplaceBackdrop] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      try {
        const result = await previewMetadata({ movieId: movie._id as any });
        if (!cancelled) {
          setPreview(result);
          if (result.status === 'ok') {
            setReplaceImage(result.replaceImageDefault);
            setReplaceBackdrop(result.replaceBackdropDefault);
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Error al buscar en TMDB');
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

  const fieldsToApply = useMemo(() => {
    if (preview?.status !== 'ok') return [];

    const fields = [...preview.fieldsToApply];
    if (replaceImage && preview.canReplaceImage && !fields.includes('image')) {
      fields.push('image');
    }
    return fields;
  }, [preview, replaceImage]);

  const willApplyBackdrop =
    preview?.status === 'ok' &&
    preview.canReplaceBackdrop &&
    (replaceBackdrop || !preview.hasExistingBackdrop);

  const canConfirm =
    preview?.status === 'ok' &&
    (fieldsToApply.length > 0 || (replaceImage && preview.canReplaceImage) || willApplyBackdrop);

  const handleConfirm = async () => {
    if (!preview || preview.status !== 'ok') return;

    setConfirming(true);
    try {
      const result = await enrichMovie({
        movieId: movie._id as any,
        tmdbId: preview.tmdb.tmdbId,
        replaceImage: replaceImage && preview.canReplaceImage ? true : undefined,
        replaceBackdrop: willApplyBackdrop ? true : undefined,
      });

      const messages: string[] = [];
      if (result.updated) {
        messages.push(`Metadata (${result.fields.join(', ') || 'sin cambios'})`);
      }
      if (result.backdropUpdated) {
        messages.push('backdrop actualizado');
      }

      if (messages.length > 0) {
        toast.success(messages.join(' · '));
      } else {
        toast.info('No había campos por aplicar');
      }
      onEnriched();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al enriquecer');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        className="w-full max-w-2xl bg-cinema-surface border border-cinema-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrich-modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-border shrink-0">
          <h2
            id="enrich-modal-title"
            className="text-lg font-semibold text-white flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-cinema-gold" />
            Completar desde TMDB
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
          <p className="text-sm text-cinema-muted mb-4">
            Película local: <span className="text-white">{getAdminMovieDisplayName(movie)}</span>
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : preview?.status === 'nothing_to_fill' ? (
            <p className="text-cinema-muted py-8 text-center">
              Esta película ya tiene todos los campos completos y TMDB no ofrece poster ni backdrop.
            </p>
          ) : preview?.status === 'not_found' ? (
            <p className="text-cinema-muted py-8 text-center">
              TMDB no encontró resultados para &quot;{preview.searchQuery}&quot;.
            </p>
          ) : preview?.status === 'ok' ? (
            <div className="space-y-5">
              {preview.canReplaceImage && (
                <div className="rounded-xl border border-cinema-border bg-cinema-elevated/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-cinema-muted mb-3">Poster</p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <div className="text-center">
                      <p className="text-xs text-cinema-muted mb-2">Actual</p>
                      <div className="w-20 h-28 rounded-lg overflow-hidden bg-cinema-elevated border border-cinema-border">
                        {preview.hasExistingImage ? (
                          <MoviePoster
                            src={preview.movie.image || movie.image}
                            alt="Poster actual"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-cinema-muted px-1">
                            Sin poster
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-cinema-muted shrink-0" />
                    <div className="text-center">
                      <p className="text-xs text-cinema-muted mb-2">TMDB</p>
                      <div className="w-20 h-28 rounded-lg overflow-hidden bg-cinema-elevated border border-cinema-gold/30">
                        {preview.tmdb.posterUrl ? (
                          <MoviePoster
                            src={preview.tmdb.posterUrl}
                            alt={preview.tmdb.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-cinema-muted">
                            Sin poster
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <label
                    className={cn(
                      'mt-4 flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      replaceImage
                        ? 'border-cinema-gold/40 bg-cinema-gold/10'
                        : 'border-cinema-border hover:border-cinema-silver/30'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={replaceImage}
                      onChange={(e) => setReplaceImage(e.target.checked)}
                      className="mt-0.5 rounded border-cinema-border bg-cinema-surface text-cinema-gold focus:ring-cinema-gold/50"
                    />
                    <span className="text-sm text-cinema-silver leading-snug">
                      {preview.hasExistingImage ? (
                        <>
                          <span className="text-white font-medium">
                            Reemplazar el poster actual
                          </span>{' '}
                          por el de TMDB (se borrará la imagen anterior en storage si aplica)
                        </>
                      ) : (
                        <>
                          <span className="text-white font-medium">Usar el poster de TMDB</span>{' '}
                          para completar la imagen faltante
                        </>
                      )}
                    </span>
                  </label>
                </div>
              )}

              {preview.canReplaceBackdrop && (
                <div className="rounded-xl border border-cinema-border bg-cinema-elevated/40 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs uppercase tracking-wide text-cinema-muted">Backdrop</p>
                    {willApplyBackdrop && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Se aplicará
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <div className="text-center">
                      <p className="text-xs text-cinema-muted mb-2">Actual</p>
                      <div className="w-32 h-18 sm:w-40 sm:h-22 rounded-lg overflow-hidden bg-cinema-elevated border border-cinema-border aspect-video">
                        {preview.hasExistingBackdrop ? (
                          <MoviePoster
                            src={preview.movie.backdropImage || movie.backdropImage || ''}
                            alt="Backdrop actual"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-cinema-muted px-2 gap-1">
                            <Monitor className="w-4 h-4" aria-hidden />
                            <span>Sin backdrop</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-cinema-muted shrink-0" />
                    <div className="text-center">
                      <p className="text-xs text-cinema-muted mb-2">TMDB</p>
                      <div className="w-32 sm:w-40 rounded-lg overflow-hidden bg-cinema-elevated border border-cyan-500/30 aspect-video">
                        {preview.tmdb.backdropUrl ? (
                          <MoviePoster
                            src={preview.tmdb.backdropUrl}
                            alt={`Backdrop de ${preview.tmdb.title}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-cinema-muted">
                            Sin backdrop
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <label
                    className={cn(
                      'mt-4 flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      replaceBackdrop && preview.hasExistingBackdrop
                        ? 'border-cyan-500/40 bg-cyan-500/10'
                        : 'border-cinema-border hover:border-cinema-silver/30'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={replaceBackdrop}
                      onChange={(e) => setReplaceBackdrop(e.target.checked)}
                      disabled={!preview.hasExistingBackdrop}
                      className="mt-0.5 rounded border-cinema-border bg-cinema-surface text-cyan-400 focus:ring-cyan-400/50 disabled:opacity-40"
                    />
                    <span className="text-sm text-cinema-silver leading-snug">
                      {preview.hasExistingBackdrop ? (
                        <>
                          <span className="text-white font-medium">
                            Reemplazar el backdrop actual
                          </span>{' '}
                          por el de TMDB (se borrará la imagen anterior en storage si aplica)
                        </>
                      ) : (
                        <>
                          <span className="text-white font-medium">
                            Descargar el backdrop de TMDB
                          </span>{' '}
                          para completar la imagen ancha faltante
                        </>
                      )}
                    </span>
                  </label>
                </div>
              )}

              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-white">{preview.tmdb.title}</h3>
                {preview.tmdb.originalTitle !== preview.tmdb.title && (
                  <p className="text-sm text-cinema-muted mt-0.5">{preview.tmdb.originalTitle}</p>
                )}
                <p className="text-sm text-cinema-gold mt-2">{preview.tmdb.releaseYear}</p>
                <p className="text-sm text-cinema-muted mt-1">
                  {preview.tmdb.genre} · {preview.tmdb.classification}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-cinema-muted mb-1">Sinopsis</p>
                <p className="text-sm text-cinema-silver leading-relaxed line-clamp-4">
                  {preview.tmdb.synopsis || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-cinema-muted mb-1">Actores</p>
                <p className="text-sm text-cinema-silver">{preview.tmdb.actors || '—'}</p>
              </div>

              <div className="rounded-xl border border-cinema-border bg-cinema-elevated/40 p-4">
                <p className="text-xs uppercase tracking-wide text-cinema-muted mb-2">
                  Campos que se aplicarán
                </p>
                <div className="flex flex-wrap gap-2">
                  {fieldsToApply.length === 0 && !willApplyBackdrop ? (
                    <span className="text-sm text-cinema-muted">
                      Ninguno — marca la opción de poster o backdrop si quieres cambiar las imágenes
                    </span>
                  ) : (
                    <>
                      {fieldsToApply.map((field) => (
                        <span
                          key={field}
                          className="text-xs px-2.5 py-1 rounded-full bg-cinema-violet/20 text-cinema-violet-light border border-cinema-violet/30"
                        >
                          {FIELD_LABELS[field] ?? field}
                        </span>
                      ))}
                      {willApplyBackdrop && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          Backdrop
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cinema-border shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={confirming}>
            Cancelar
          </Button>
          {canConfirm && (
            <Button onClick={handleConfirm} disabled={confirming || loading}>
              {confirming ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Confirmar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
