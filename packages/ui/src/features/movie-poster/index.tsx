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
}

function MoviePosterBase({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority,
  style,
}: MoviePosterProps) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={!src ? PLACEHOLDER : failed ? undefined : src}
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
