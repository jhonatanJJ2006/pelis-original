'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Hls from 'hls.js';
import { Film, X } from 'lucide-react';
import { Button } from '@pelis/ui/components';
import { MoviePoster } from '@pelis/ui/features/movie-poster';

interface PreviewMovie {
  _id: string;
  name: string;
  image: string;
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
  };
}

interface PreviewMovieModalProps {
  movie: PreviewMovie;
  onClose: () => void;
}

function AdminPreviewVideo({ src, poster, title }: { src: string; poster: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isHls = src.includes('.m3u8');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isHls) {
      video.src = src;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
  }, [src, isHls]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      poster={poster}
      className="w-full aspect-video bg-black rounded-xl"
      aria-label={`Reproducir ${title}`}
    />
  );
}

export function PreviewMovieModal({ movie, onClose }: PreviewMovieModalProps) {
  const hasVideo = Boolean(movie.videoUrl?.trim());

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
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-cinema-surface border border-cinema-border rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-movie-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-border sticky top-0 bg-cinema-surface z-10">
          <h2 id="preview-movie-title" className="text-lg font-semibold text-white truncate pr-4">
            {movie.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-cinema-ash hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-24 h-36 shrink-0 rounded-lg overflow-hidden bg-cinema-elevated">
              <MoviePoster
                src={movie.image}
                alt={movie.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              {movie.genre && (
                <p>
                  <span className="text-cinema-muted">Género: </span>
                  <span className="text-white">{movie.genre}</span>
                </p>
              )}
              {movie.releaseYear && (
                <p>
                  <span className="text-cinema-muted">Año: </span>
                  <span className="text-white">{movie.releaseYear}</span>
                </p>
              )}
              <p>
                <span className="text-cinema-muted">Token: </span>
                <span className="text-cinema-silver font-mono text-xs break-all">{movie.token}</span>
              </p>
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cinema-gold/20 text-cinema-gold">
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

          {hasVideo ? (
            <AdminPreviewVideo src={movie.videoUrl!} poster={movie.image} title={movie.name} />
          ) : (
            <div className="flex flex-col items-center text-center py-8 px-4 rounded-xl bg-cinema-elevated/40 border border-cinema-border">
              <div className="w-14 h-14 rounded-2xl bg-cinema-elevated flex items-center justify-center mb-3">
                <Film className="w-7 h-7 text-cinema-ash" aria-hidden />
              </div>
              <h3 className="text-white font-semibold mb-1">Sin video disponible</h3>
              <p className="text-cinema-muted text-sm max-w-sm">
                Esta película no tiene enlace de video. Edítala o enlázala con otra que sí lo tenga.
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
