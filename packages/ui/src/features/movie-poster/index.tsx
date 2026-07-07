'use client';

import { useState } from 'react';
import { cn } from '../../shared/utils';

const PLACEHOLDER = '/peliculas/placeholder.webp';

function getFallbackSrc(src: string, stage: number): string {
  if (stage === 0) return src;
  if (stage === 1 && src.endsWith('.webp')) {
    return src.replace(/\.webp$/, '.png');
  }
  return PLACEHOLDER;
}

interface MoviePosterProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function MoviePoster({
  src,
  alt,
  className,
  loading = 'lazy',
}: MoviePosterProps) {
  const [stage, setStage] = useState(0);
  const currentSrc = getFallbackSrc(src, stage);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={cn(className)}
      loading={loading}
      onError={() => {
        if (stage < 2) setStage((prev) => prev + 1);
      }}
    />
  );
}
