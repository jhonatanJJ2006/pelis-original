'use client';

import { memo, useState, type CSSProperties } from 'react';
import { cn } from '../../shared/utils';

interface MoviePosterProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  style?: CSSProperties;
  responsive?: boolean;
  /** Imagen a todo el ancho (hero/ficha): pide 1280/1920 px, nunca la variante de 400 px. */
  hero?: boolean;
}

function buildSrcSet(src: string, hero = false): string | undefined {
  if (!src.startsWith('/peliculas/') && !src.startsWith('/uploads/')) return undefined;
  if (
    !src.endsWith('.webp') &&
    !src.endsWith('.jpg') &&
    !src.endsWith('.jpeg') &&
    !src.endsWith('.png')
  ) {
    return undefined;
  }
  const base = src.replace(/\.(webp|jpg|jpeg|png)$/i, '');
  if (hero) return `${base}-1280.webp 1280w, ${src} 1920w`;
  return `${base}-200.webp 200w, ${base}-400.webp 400w`;
}

function MoviePosterBase({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority,
  style,
  responsive = true,
  hero = false,
}: MoviePosterProps) {
  // 0 = con srcSet, 1 = sin srcSet (las variantes -200/-400 no existen para la
  // mayoría de /uploads y daban 404 → la tarjeta quedaba sin imagen), 2 = respaldo.
  const [stage, setStage] = useState(0);
  const [lastSrc, setLastSrc] = useState(src);
  if (lastSrc !== src) {
    setLastSrc(src);
    setStage(0);
  }
  const candidateSrcSet = responsive ? buildSrcSet(src, hero) : undefined;
  const srcSet = stage === 0 ? candidateSrcSet : undefined;
  const isPlaceholder = !src || src.endsWith('/placeholder.webp');

  if (isPlaceholder || stage >= 2) {
    return (
      <div
        className={cn('relative overflow-hidden bg-cinema-bg', className)}
        style={style}
        role="img"
        aria-label={alt}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cinema-elevated via-cinema-surface to-cinema-bg" />
        <div className="absolute inset-[6%] border border-cinema-accent/25 flex flex-col items-center justify-center gap-2 p-3 text-center">
          <span className="font-display text-2xl text-cinema-accent/70" aria-hidden>
            P
          </span>
          <span className="font-display text-sm leading-snug text-cinema-chalk/85 line-clamp-4 break-words">
            {alt}
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? (hero ? '100vw' : '(max-width: 640px) 200px, 400px') : undefined}
      alt={alt}
      className={cn(className)}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      draggable={false}
      style={style}
      onError={() => setStage((n) => (n === 0 && candidateSrcSet ? 1 : 2))}
    />
  );
}

export const MoviePoster = memo(MoviePosterBase);
