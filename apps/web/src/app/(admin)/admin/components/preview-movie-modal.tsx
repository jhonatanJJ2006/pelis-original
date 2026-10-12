'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Hls from 'hls.js';
import { AlertCircle, Film, Loader2, Monitor, X } from 'lucide-react';
import { Button } from '@pelis/ui/components';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { getAdminMovieDisplayName } from '../lib/movie-display';
import { resolveVideoUrl } from '@/hooks/use-resolved-video-url';

interface PreviewMovie {
  _id: string;
  name: string;
  image: string;
  backdropImage?: string;
  token: string;
  genre?: string;
  releaseYear?: string;
  actors?: string;
  synopsis?: string;
  videoUrl?: string;
  quality?: {
    isOrphanId: boolean;
    isMissingImage: boolean;
    isMissingVideo: boolean;
    isIncomplete: boolean;
    isMissingBackdrop?: boolean;
  };
}

interface PreviewMovieModalProps {
  movie: PreviewMovie;
  onClose: () => void;
  onBackdrop?: () => void;
}

async function resolveEffectiveVideoUrl(movie: PreviewMovie): Promise<string | null> {
  return resolveVideoUrl(movie.videoUrl, movie.token);
}

function AdminPreviewVideo({ src, poster, title }: { src: string; poster: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isHls = src.includes('.m3u8');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);

    const onVideoError = () => {
      setError('No se pudo reproducir el video.');
      setLoading(false);
    };

    if (!isHls) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => setLoading(false));
      video.addEventListener('error', onVideoError);
      return () => {
        video.removeEventListener('error', onVideoError);
        video.src = '';
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });

      hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          const detail = data.details ? `: ${data.details}` : '';
          setError(`No se pudo cargar el video (HLS ${data.type}${detail}).`);
          setLoading(false);
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
        video.src = '';
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => setLoading(false));
      video.addEventListener('error', onVideoError);
      return () => {
        video.removeEventListener('error', onVideoError);
        video.src = '';
      };
    }

    setError('Tu navegador no soporta este formato de video.');
    setLoading(false);
  }, [src, isHls]);

  return (
    <div className="relative w-full" data-testid="admin-preview-video" data-video-url={src}>
      <video
        ref={videoRef}
        controls
        playsInline
        poster={poster}
        className="w-full aspect-video bg-black rounded-[2px]"
        aria-label={`Reproducir ${title}`}
      />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-[2px]">
          <Loader2 className="w-8 h-8 text-cinema-chalk animate-spin" aria-hidden />
        </div>
      )}
      {error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-[2px] p-4 text-center"
          data-testid="admin-preview-video-error"
        >
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" aria-hidden />
          <p className="text-cinema-chalk text-sm font-medium">{error}</p>
          <p className="text-cinema-ash text-xs mt-2 break-all max-w-full">{src}</p>
        </div>
      )}
    </div>
  );
}

export function PreviewMovieModal({ movie, onClose, onBackdrop }: PreviewMovieModalProps) {
  const [effectiveVideoUrl, setEffectiveVideoUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const displayName = getAdminMovieDisplayName(movie);
  const usingFallback = !movie.videoUrl?.trim() && Boolean(movie.token);

  useEffect(() => {
    let cancelled = false;
    setResolving(true);
    resolveEffectiveVideoUrl(movie)
      .then((url) => {
        if (!cancelled) setEffectiveVideoUrl(url);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [movie]);

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

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-cinema-surface border border-cinema-border rounded-[2px] shadow-2xl mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-movie-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-border sticky top-0 bg-cinema-surface z-10">
          <h2
            id="preview-movie-title"
            className="text-lg font-semibold text-cinema-chalk truncate pr-4"
          >
            {displayName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-cinema-ash hover:text-cinema-chalk transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-24 h-36 shrink-0 rounded-[2px] overflow-hidden bg-cinema-elevated">
              <MoviePoster
                src={movie.image}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              {movie.genre && (
                <p>
                  <span className="text-cinema-muted">Género: </span>
                  <span className="text-cinema-chalk">{movie.genre}</span>
                </p>
              )}
              {movie.releaseYear && (
                <p>
                  <span className="text-cinema-muted">Año: </span>
                  <span className="text-cinema-chalk">{movie.releaseYear}</span>
                </p>
              )}
              <p>
                <span className="text-cinema-muted">Token: </span>
                <span className="text-cinema-silver font-mono text-xs break-all">
                  {movie.token}
                </span>
              </p>
              {effectiveVideoUrl && (
                <p>
                  <span className="text-cinema-muted">Video: </span>
                  <span className="text-cinema-silver font-mono text-xs break-all">
                    {effectiveVideoUrl}
                    {usingFallback && ' (desde token)'}
                  </span>
                </p>
              )}
              {movie.actors && (
                <p>
                  <span className="text-cinema-muted">Actores: </span>
                  <span className="text-cinema-silver">{movie.actors}</span>
                </p>
              )}
              {movie.quality && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {movie.quality.isOrphanId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                      ID huérfano
                    </span>
                  )}
                  {movie.quality.isMissingImage && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                      Sin imagen
                    </span>
                  )}
                  {movie.quality.isMissingVideo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                      Sin video
                    </span>
                  )}
                  {movie.quality.isIncomplete && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cinema-accent/20 text-cinema-accent">
                      Incompleta
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {movie.synopsis && (
            <p className="text-sm text-cinema-silver leading-relaxed">{movie.synopsis}</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-cinema-muted">
                Backdrop (hero / reproductor)
              </p>
              {onBackdrop && !movie.quality?.isOrphanId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBackdrop}
                  data-testid="admin-preview-backdrop-button"
                >
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  {movie.backdropImage ? 'Cambiar backdrop' : 'Agregar backdrop'}
                </Button>
              )}
            </div>
            <div
              className={`relative w-full aspect-video rounded-[2px] overflow-hidden border bg-cinema-elevated ${
                movie.backdropImage ? 'border-cinema-border' : 'border-dashed border-cinema-border'
              }`}
              data-testid="admin-preview-backdrop"
            >
              {movie.backdropImage ? (
                <MoviePoster
                  src={movie.backdropImage}
                  alt={`Backdrop de ${displayName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center px-4 gap-1">
                  <Monitor className="w-6 h-6 text-cinema-ash" aria-hidden />
                  <p className="text-sm text-cinema-muted">
                    Esta película aún no tiene imagen ancha.
                  </p>
                  {onBackdrop && !movie.quality?.isOrphanId && (
                    <p className="text-xs text-cinema-ash">
                      Usa “Agregar backdrop” para buscar una en TMDB.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {resolving ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cinema-muted animate-spin" aria-hidden />
            </div>
          ) : effectiveVideoUrl ? (
            <AdminPreviewVideo src={effectiveVideoUrl} poster={movie.image} title={displayName} />
          ) : (
            <div
              className="flex flex-col items-center text-center py-8 px-4 rounded-[2px] bg-cinema-elevated/40 border border-cinema-border"
              data-testid="admin-preview-no-video"
            >
              <div className="w-14 h-14 rounded-[2px] bg-cinema-elevated flex items-center justify-center mb-3">
                <Film className="w-7 h-7 text-cinema-ash" aria-hidden />
              </div>
              <h3 className="text-cinema-chalk font-semibold mb-1">Sin video disponible</h3>
              <p className="text-cinema-muted text-sm max-w-sm">
                No hay stream disponible para esta película. Comprueba que exista en{' '}
                <span className="font-mono">MOVIE_OUTPUT_ROOT</span> o añade un{' '}
                <span className="font-mono">videoUrl</span> válido en la ficha de edición.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-cinema-border bg-cinema-elevated/30">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Link href={`/admin/movies/${movie._id}/edit`}>
            <Button variant="secondary" onClick={onClose}>
              Editar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
