'use client';

import { memo, useState, type CSSProperties } from 'react';
import { cn } from '../../shared/utils';

const PLACEHOLDER = '/peliculas/placeholder.webp';

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

  return (
    <img
      src={!src || failed ? PLACEHOLDER : src}
      srcSet={failed ? undefined : srcSet}
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