'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Play, Info, Sparkles } from 'lucide-react';
import type { MediaItem } from '@pelis/ui/types';
import { cn } from '@pelis/ui/utils';

const HERO_PLACEHOLDER = '/peliculas/placeholder.webp';

function HeroImage({ movie, eager }: { movie: MediaItem; eager: boolean }) {
  const [failed, setFailed] = useState(false);
  const poster = movie.image;
  const source = failed ? HERO_PLACEHOLDER : poster;
  return (
    <picture className="absolute inset-0">
      <source media="(max-width: 767px)" srcSet={source} />
      <source
        media="(min-width: 768px)"
        srcSet={failed ? HERO_PLACEHOLDER : movie.backdropImage || poster}
      />
      <img
        src={source}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        className="w-full h-full object-cover object-top md:object-center"
        onError={() => setFailed(true)}
      />
    </picture>
  );
}

const genreColors: Record<string, string> = {
  Acción: 'from-red-500/25 to-transparent',
  Comedia: 'from-yellow-400/20 to-transparent',
  Drama: 'from-blue-500/30 to-transparent',
  Terror: 'from-cinema-success/20 to-transparent',
  Romance: 'from-pink-500/20 to-transparent',
  Ciencia: 'from-cyan-500/25 to-transparent',
  Suspenso: 'from-orange-500/20 to-transparent',
  Aventura: 'from-teal-500/25 to-transparent',
  Animación: 'from-blue-400/30 to-transparent',
};

function getGenreGradient(genre?: string): string {
  if (!genre) return 'from-cinema-accent/20 to-transparent';
  for (const [key, val] of Object.entries(genreColors)) {
    if (genre?.includes(key)) return val;
  }
  return 'from-cinema-accent/15 to-transparent';
}

const AUTOPLAY_DELAY_MS = 7000;
const SWIPE_THRESHOLD = 48;

interface HeroCarouselProps {
  movies: MediaItem[];
}

export function HeroCarousel({ movies }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const slideCount = movies.length;
  const hasMultiple = slideCount > 1;

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(((index % slideCount) + slideCount) % slideCount);
    },
    [slideCount]
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setPaused(true);
    event.stopPropagation();
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      event.stopPropagation();
      const startX = touchStartX.current;
      touchStartX.current = null;
      setPaused(false);

      if (startX === null || !hasMultiple) return;
      const endX = event.changedTouches[0]?.clientX;
      if (endX === undefined) return;

      const dx = endX - startX;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      if (dx < 0) goNext();
      else goPrev();
    },
    [goNext, goPrev, hasMultiple]
  );

  useEffect(() => {
    if (!hasMultiple || paused) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearInterval(id);
  }, [hasMultiple, paused, slideCount]);

  const pauseProps = useMemo(
    () => ({
      onMouseEnter: () => setPaused(true),
      onMouseLeave: () => setPaused(false),
      onFocusCapture: () => setPaused(true),
      onBlurCapture: () => setPaused(false),
    }),
    []
  );

  if (movies.length === 0) {
    return (
      <section
        className="relative aspect-[4/5] max-h-[85vh] w-full sm:aspect-auto sm:h-[70vh] sm:min-h-[500px] sm:max-h-[860px] overflow-hidden bg-cinema-surface animate-pulse"
        aria-label="Destacados"
        aria-busy="true"
      />
    );
  }

  return (
    <section
      data-hero-carousel
      className="relative aspect-[4/5] max-h-[85vh] w-full sm:aspect-auto sm:h-[70vh] sm:min-h-[500px] sm:max-h-[860px] overflow-hidden touch-pan-y"
      aria-label="Destacados"
      aria-roledescription="carrusel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <h1 className="sr-only">Películas y series destacadas</h1>

      <div className="absolute inset-0" {...pauseProps}>
        {movies.map((movie, movieIndex) => {
          const isActive = movieIndex === activeIndex;
          const genreGrad = getGenreGradient(movie.genre);
          return (
            <div
              key={movie._id}
              className={cn(
                'absolute inset-0 transition-opacity duration-700 ease-out',
                isActive ? 'opacity-100 z-20' : 'opacity-0 z-10 pointer-events-none'
              )}
              aria-hidden={!isActive}
            >
              <div className="relative h-full overflow-hidden">
                <div className="absolute inset-0">
                  <HeroImage movie={movie} eager={movieIndex === 0} />
                </div>
                <div
                  className={`absolute inset-0 hero-gradient-right bg-gradient-to-r ${genreGrad}`}
                />
                <div className="absolute inset-0 hero-gradient-bottom" />
                <div className="absolute inset-0 hero-gradient-accent" />

                <div className="absolute inset-0 flex items-center">
                  <div className="container mx-auto px-6 sm:px-8 md:px-14 lg:px-20">
                    <div className="max-w-3xl">
                      <div
                        className={cn(
                          'flex items-center gap-3 mb-4 transition-all duration-500 ease-out',
                          isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-cinema-accent/60 text-cinema-accent text-label font-semibold rounded-full uppercase">
                          <Sparkles className="w-3.5 h-3.5" aria-hidden />
                          Destacado
                        </span>
                        <span className="text-sm text-cinema-muted">
                          {movie.genre} &middot; {movie.releaseYear}
                        </span>
                      </div>
                      <h2
                        className={cn(
                          'font-display text-3xl sm:text-5xl md:text-7xl lg:text-8xl tracking-tight text-cinema-chalk leading-[0.95] mb-5 transition-all duration-500 ease-out delay-75 break-words',
                          isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                        )}
                      >
                        {movie.name}
                      </h2>
                      <p
                        className={cn(
                          'text-cinema-muted text-base md:text-lg mb-8 max-w-xl line-clamp-3 leading-relaxed transition-all duration-500 ease-out delay-150',
                          isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                        )}
                      >
                        {movie.synopsis}
                      </p>
                      <div
                        className={cn(
                          'flex flex-wrap items-center gap-3 transition-all duration-500 ease-out delay-200',
                          isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                        )}
                      >
                        <Link
                          href={`/movies/${movie._id}?play=true`}
                          tabIndex={isActive ? 0 : -1}
                          className="btn-base h-11 bg-cinema-accent hover:bg-cinema-accent-light text-cinema-bg inline-flex items-center gap-2 px-6 text-[15px]"
                        >
                          <Play className="w-5 h-5" fill="currentColor" aria-hidden />
                          Reproducir
                        </Link>
                        <Link
                          href={`/movies/${movie._id}`}
                          tabIndex={isActive ? 0 : -1}
                          className="btn-base h-11 border border-cinema-chalk/50 bg-cinema-bg/30 backdrop-blur-sm hover:bg-cinema-chalk/10 text-cinema-chalk inline-flex items-center gap-2 px-6 text-[15px]"
                        >
                          <Info className="w-5 h-5" aria-hidden />
                          Más info
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMultiple && (
        <div className="absolute bottom-20 md:bottom-4 inset-x-0 z-30 flex justify-center gap-1.5">
          {movies.map((movie, index) => (
            <button
              key={movie._id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ir a la diapositiva ${index + 1}`}
              aria-current={index === activeIndex}
              className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-all duration-300',
                  index === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
