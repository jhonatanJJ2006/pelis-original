'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Play, Info, Sparkles, TrendingUp, Tv, Film } from 'lucide-react';
import { useUser } from '@pelis/auth/hooks';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { ContinueWatchingCard } from '@pelis/ui/features/continue-watching-card';
import { SectionHeader } from '@pelis/ui/features/section-header';
import { api } from '@pelis/convex';
import { useRef, useState, useEffect, useCallback } from 'react';
import type { MediaItem } from '@pelis/ui/types';

const genreColors: Record<string, string> = {
  Acción: 'from-red-600/30 to-transparent',
  Comedia: 'from-yellow-500/25 to-transparent',
  Drama: 'from-violet-600/25 to-transparent',
  Terror: 'from-emerald-600/25 to-transparent',
  Romance: 'from-pink-500/25 to-transparent',
  Ciencia: 'from-cyan-500/25 to-transparent',
  Ficción: 'from-cyan-500/25 to-transparent',
  Suspenso: 'from-orange-600/25 to-transparent',
  Aventura: 'from-teal-500/25 to-transparent',
  Animación: 'from-blue-500/25 to-transparent',
};

function getGenreGradient(genre?: string): string {
  if (!genre) return 'from-cinema-accent/20 to-transparent';
  for (const [key, val] of Object.entries(genreColors)) {
    if (genre.includes(key)) return val;
  }
  return 'from-cinema-accent/20 to-transparent';
}

function HeroSlide({ movie, isActive }: { movie: MediaItem; isActive: boolean }) {
  const genreGrad = getGenreGradient(movie.genre);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out cinema-grain ${
        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
      }`}
      aria-hidden={!isActive}
    >
      <div className="absolute inset-0 overflow-hidden">
        <MoviePoster
          src={movie.image}
          alt={movie.name}
          className="w-full h-full object-cover"
          loading="eager"
          style={{
            animation: isActive ? 'heroKenBurns 9s ease-out forwards' : undefined,
          }}
        />
      </div>
      <div className={`absolute inset-0 bg-gradient-to-r from-cinema-bg via-cinema-bg/70 to-transparent ${genreGrad}`} />
      <div className="absolute inset-0 hero-gradient-bottom" />
      <div className="absolute inset-0 hero-gradient-accent" />

      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14 lg:p-20">
        <div className="container mx-auto max-w-4xl">
          <div className={`flex items-center gap-2 mb-4 ${isActive ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`} style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cinema-accent text-white text-xs font-semibold rounded-full uppercase tracking-wide shadow-lg shadow-cinema-accent/30">
              <Sparkles className="w-3.5 h-3.5" />
              Destacado
            </span>
            <span className="text-sm text-zinc-400">{movie.genre} · {movie.releaseYear}</span>
          </div>
          <h1
            className={`font-display text-5xl md:text-7xl lg:text-8xl tracking-wide text-white uppercase leading-[0.95] mb-5 ${isActive ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}
            style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}
          >
            {movie.name}
          </h1>
          <p
            className={`text-zinc-300 text-base md:text-lg mb-8 max-w-xl line-clamp-3 leading-relaxed ${isActive ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}
            style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}
          >
            {movie.synopsis}
          </p>
          <div
            className={`flex flex-wrap items-center gap-3 ${isActive ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}
            style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}
          >
            <Link href={`/movies/${movie._id}?play=true`}>
              <button className="btn-primary-glow flex items-center gap-2 px-7 py-3.5 text-base">
                <Play className="w-5 h-5" fill="currentColor" />
                Reproducir
              </button>
            </Link>
            <Link href={`/movies/${movie._id}`}>
              <button className="btn-secondary flex items-center gap-2 px-7 py-3.5 text-base">
                <Info className="w-5 h-5" />
                Más info
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePageClient() {
  const { user } = useUser();
  const movies = (useQuery(api.movies.list, { mediaType: 'movie' }) as MediaItem[] | undefined) ?? [];
  const featuredMovies = (useQuery(api.movies.getFeatured, {}) as MediaItem[] | undefined) ?? [];
  const trending = (useQuery(api.movies.getTrending, { limit: 12 }) as MediaItem[] | undefined) ?? [];
  const series = (useQuery(api.movies.listSeries, {}) as MediaItem[] | undefined) ?? [];
  const genres = (useQuery(api.movies.getGenres, {}) as string[] | undefined) ?? [];
  const continueWatching = useQuery(
    api.history.getContinueWatching,
    user ? { userId: user._id as any, limit: 10 } : 'skip'
  );

  const [heroIndex, setHeroIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);

  const hasActivePlan = user?.planExpiresAt && user.planExpiresAt > Date.now();
  const topGenres = genres.slice(0, 4);

  const goToSlide = useCallback((index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setHeroIndex(index);
    setTimeout(() => setIsAnimating(false), 1000);
  }, [isAnimating]);

  const nextSlide = useCallback(() => {
    if (featuredMovies.length <= 1) return;
    goToSlide((heroIndex + 1) % featuredMovies.length);
  }, [heroIndex, featuredMovies.length, goToSlide]);

  const prevSlide = useCallback(() => {
    if (featuredMovies.length <= 1) return;
    goToSlide((heroIndex - 1 + featuredMovies.length) % featuredMovies.length);
  }, [heroIndex, featuredMovies.length, goToSlide]);

  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    intervalRef.current = setInterval(nextSlide, 7000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [nextSlide, featuredMovies.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  return (
    <div className="pb-12">
      {featuredMovies.length > 0 && (
        <section
          className="group relative h-[70vh] min-h-[480px] max-h-[820px] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {featuredMovies.map((movie, i) => (
            <HeroSlide key={movie._id} movie={movie} isActive={i === heroIndex} />
          ))}

          {featuredMovies.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:bg-black/70 hover:scale-110 hidden md:flex"
                aria-label="Anterior"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:bg-black/70 hover:scale-110 hidden md:flex"
                aria-label="Siguiente"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {featuredMovies.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {featuredMovies.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToSlide(i)}
                  className={`rounded-full transition-all duration-500 ${
                    i === heroIndex
                      ? 'w-8 h-2 bg-cinema-accent shadow-lg shadow-cinema-accent/40'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Ir al destacado ${i + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="container mx-auto px-4 py-10 space-y-12 md:space-y-16">
        {user && continueWatching && continueWatching.length > 0 && (
          <section className="animate-fade-in">
            <SectionHeader title="Continuar viendo" subtitle="Retoma donde lo dejaste" href="/history" />
            <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide">
              {continueWatching.map(
                (item) =>
                  item.movie && (
                    <ContinueWatchingCard
                      key={item._id}
                      movie={item.movie as MediaItem}
                      progress={item.progress}
                      duration={item.duration}
                    />
                  )
              )}
            </div>
          </section>
        )}

        <section className="animate-fade-in">
          <MovieRow
            title="Tendencias"
            subtitle="Lo más popular ahora"
            movies={trending}
            href="/movies"
          />
        </section>

        <section className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <MovieRow
            title="Series"
            subtitle="Maratón garantizado"
            movies={series}
            href="/series"
            linkLabel="Ver series"
          />
        </section>

        {topGenres.map((genre, idx) => {
          const genreMovies = movies.filter((m) => m.genre === genre).slice(0, 12);
          if (genreMovies.length === 0) return null;
          return (
            <section
              key={genre}
              className="animate-fade-in"
              style={{ animationDelay: `${(idx + 2) * 100}ms` }}
            >
              <MovieRow
                title={genre}
                movies={genreMovies}
                href={`/movies?genre=${encodeURIComponent(genre)}`}
              />
            </section>
          );
        })}

        <section className="animate-fade-in" style={{ animationDelay: '600ms' }}>
          <SectionHeader title="Explorar por género" subtitle="Descubre contenido por tu género favorito" />
          <div className="flex flex-wrap gap-3">
            {genres.map((genre) => {
              const genreGrad = genreColors[genre] || 'from-cinema-accent/20';
              return (
                <Link
                  key={genre}
                  href={`/movies?genre=${encodeURIComponent(genre)}`}
                  className="group relative overflow-hidden px-5 py-3 bg-cinema-surface border border-cinema-border hover:border-cinema-accent/40 rounded-full text-sm text-zinc-300 hover:text-white transition-all duration-300 hover:scale-105"
                >
                  <span className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${genreGrad}`} />
                  <span className="relative z-10">{genre}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
