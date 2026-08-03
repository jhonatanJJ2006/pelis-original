'use client';

import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
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
  const ref = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(loading !== 'lazy');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible || !src) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 200px 300px 200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, src]);

  const currentSrc = !src ? PLACEHOLDER : !visible || failed ? undefined : src;

  return (
    <img
      ref={ref}
      src={currentSrc}
      alt={alt}
      className={cn(className)}
      loading={loading}
      fetchpriority={fetchPriority}
      decoding="async"
      draggable={false}
      style={style}
      onError={() => {
        if (visible) setFailed(true);
      }}
    />
  );
}

export const MoviePoster = memo(MoviePosterBase);
