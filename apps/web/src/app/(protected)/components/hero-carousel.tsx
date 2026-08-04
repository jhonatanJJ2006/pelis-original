'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Play, Info, Sparkles } from 'lucide-react';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import type { MediaItem } from '@pelis/ui/types';
import { cn } from '@pelis/ui/utils';

const genreColors: Record<string, string> = {
  Acción: 'from-red-500/25 to-transparent',
  Comedia: 'from-yellow-400/20 to-transparent',
  Drama: 'from-blue-500/30 to-transparent',
  Terror: 'from-emerald-500/20 to-transparent',
  Romance: 'from-pink-500/20 to-transparent',
  Ciencia: 'from-cyan-500/25 to-transparent',
  Suspenso: 'from-orange-500/20 to-transparent',
  Aventura: 'from-teal-500/25 to-transparent',
  Animación: 'from-blue-400/30 to-transparent',
};

function getGenreGradient(genre?: string): string {
  if (!genre) return 'from-cinema-violet/20 to-transparent';
  for (const [key, val] of Object.entries(genreColors)) {
    if (genre?.includes(key)) return val;
  }
  return 'from-cinema-violet/15 to-transparent';
}

const AUTOPLAY_DELAY_MS = 7000;

interface HeroCarouselProps {
  movies: MediaItem[];
}

export function HeroCarousel({ movies }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slideCount = movies.length;
  const hasMultiple = slideCount > 1;

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(((index % slideCount) + slideCount) % slideCount);
    },
    [slideCount]
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
        className="relative h-[75vh] min-h-[400px] sm:min-h-[500px] max-h-[900px] overflow-hidden bg-cinema-surface animate-pulse"
        aria-label="Destacados"
        aria-busy="true"
      />
    );
  }

  return (
    <section
      className="relative h-[75vh] min-h-[400px] sm:min-h-[500px] max-h-[900px] overflow-hidden"
      aria-label="Destacados"
      aria-roledescription="carrusel"
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
                  <MoviePoster
                    src={movie.image}
                    alt=""
                    className="w-full h-full object-cover"
                    loading={movieIndex === 0 ? 'eager' : 'lazy'}
                    fetchPriority={movieIndex === 0 ? 'high' : undefined}
                  />
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cinema-violet text-white text-xs font-semibold rounded-full uppercase tracking-wide shadow-glow-violet">
                          <Sparkles className="w-3.5 h-3.5" aria-hidden />
                          Destacado
                        </span>
                        <span className="text-sm text-cinema-muted">
                          {movie.genre} &middot; {movie.releaseYear}
                        </span>
                      </div>
                      <h2
                        className={cn(
                          'font-display text-3xl sm:text-5xl md:text-7xl lg:text-8xl tracking-wide text-white uppercase leading-[0.95] mb-5 transition-all duration-500 ease-out delay-75 break-words',
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
                          className="btn-primary-glow inline-flex items-center gap-2 px-7 py-3.5 text-base"
                        >
                          <Play className="w-5 h-5" fill="currentColor" aria-hidden />
                          Reproducir
                        </Link>
                        <Link
                          href={`/movies/${movie._id}`}
                          tabIndex={isActive ? 0 : -1}
                          className="btn-secondary inline-flex items-center gap-2 px-7 py-3.5 text-base"
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
        <div className="absolute bottom-4 inset-x-0 z-30 flex justify-center gap-1.5">
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