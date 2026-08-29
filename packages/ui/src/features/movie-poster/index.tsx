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
}

function buildSrcSet(src: string): string | undefined {
  if (!src.startsWith('/peliculas/') && !src.startsWith('/uploads/')) return undefined;
  if (!src.endsWith('.webp') && !src.endsWith('.jpg') && !src.endsWith('.jpeg') && !src.endsWith('.png')) {
    return undefined;
  }
  const base = src.replace(/\.(webp|jpg|jpeg|png)$/i, '');
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
}: MoviePosterProps) {
  const [failed, setFailed] = useState(false);
  const srcSet = responsive ? buildSrcSet(src) : undefined;

  if (!src || failed) {
    return (
      <div
        className={cn('relative overflow-hidden bg-cinema-bg', className)}
        style={style}
        role="img"
        aria-label={alt}
      >
        <div className="absolute inset-x-0 top-0 h-[11%] bg-cinema-bg border-b border-cinema-border/50" />
        <div className="absolute inset-x-0 bottom-0 h-[11%] bg-cinema-bg border-t border-cinema-border/50" />
        <div className="absolute inset-x-[8%] inset-y-[11%] border border-cinema-accent/20 bg-cinema-elevated/70 flex items-center justify-center">
          <span className="font-display text-[10px] tracking-[0.28em] text-cinema-muted/45 uppercase">
            Maison Noir
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? '(max-width: 640px) 200px, 400px' : undefined}
      alt={alt}
      className={cn(className)}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      draggable={false}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

export const MoviePoster = memo(MoviePosterBase);