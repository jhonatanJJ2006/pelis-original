'use client';

import Link from 'next/link';
import { useQuery, usePreloadedQuery } from '@pelis/db/client';
import type { PreloadedQuery } from '@pelis/db/server';
import { useUser } from '@pelis/auth/hooks';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { ContinueWatchingRow } from '@pelis/ui/features/continue-watching-row';
import { SectionHeader } from '@pelis/ui/features/section-header';
import { GenreSwiper, GenreChip } from '@pelis/ui/features/genre-swiper';
import { HeroCarousel } from './hero-carousel';
import { HeroSkeleton } from '@pelis/ui/features/hero-skeleton';
import { api } from '@pelis/db/api';
import type { MediaItem } from '@pelis/ui/types';
import { cn } from '@pelis/ui/utils';
import { LandingPage } from './landing-page';

const genreColors: Record<string, string> = {
  Acción: 'from-red-500/30 to-cinema-accent/15',
  Comedia: 'from-yellow-400/25 to-cinema-accent/15',
  Drama: 'from-blue-500/30 to-cinema-teal/15',
  Terror: 'from-cinema-success/25 to-cinema-accent/15',
  Romance: 'from-pink-500/25 to-cinema-accent/15',
  Ciencia: 'from-cyan-500/25 to-cinema-accent/15',
  Suspenso: 'from-orange-500/25 to-cinema-accent/15',
  Aventura: 'from-teal-500/25 to-cinema-accent/15',
  Animación: 'from-blue-400/30 to-cinema-teal/15',
};

interface HomePageClientProps {
  preloaded: {
    featured: PreloadedQuery<MediaItem[]>;
    trending: PreloadedQuery<MediaItem[]>;
    movies: PreloadedQuery<MediaItem[]>;
    series: PreloadedQuery<MediaItem[]>;
    genres: PreloadedQuery<string[]>;
  };
}

export function HomePageClient({ preloaded }: HomePageClientProps) {
  const { user, isLoading: authLoading } = useUser();
  const liveMovies = useQuery<MediaItem[]>(api.movies.list, {}) as MediaItem[] | undefined;
  const liveFeatured = useQuery<MediaItem[]>(api.movies.getFeatured, {}) as MediaItem[] | undefined;
  const liveTrending = useQuery<MediaItem[]>(api.movies.getTrending, {}) as MediaItem[] | undefined;
  const liveSeries = useQuery<MediaItem[]>(api.movies.listSeries, {}) as MediaItem[] | undefined;
  const liveGenres = useQuery<string[]>(api.movies.getGenres, {}) as string[] | undefined;
  const continueWatching = useQuery<
    Array<{ _id: string; progress: number; duration: number; movie: MediaItem }>
  >(api.history.getContinueWatching, user ? { userId: user._id as any, limit: 10 } : 'skip');

  const movies = liveMovies ?? preloaded.movies.data;
  const featuredMovies = liveFeatured ?? preloaded.featured.data;
  const trending = liveTrending ?? preloaded.trending.data;
  const series = liveSeries ?? preloaded.series.data;
  const genres = liveGenres ?? preloaded.genres.data;

  const topGenres = (genres ?? []).slice(0, 4);
  // Sin destacados marcados en el admin, el hero usa las tendencias para no quedar vacío.
  const heroMovies =
    featuredMovies && featuredMovies.length > 0
      ? featuredMovies
      : featuredMovies === undefined
        ? undefined
        : (trending ?? movies ?? []).slice(0, 5);

  // Visitantes: landing Maison Noir. Con sesión: catálogo de inicio.
  if (authLoading) {
    return (
      <div className="page-shell py-24 flex justify-center" role="status" aria-label="Cargando">
        <HeroSkeleton />
      </div>
    );
  }
  if (!user) {
    return <LandingPage />;
  }

  const continueItems =
    continueWatching
      ?.filter((item) => item.movie)
      .map((item) => ({
        _id: item._id,
        progress: item.progress,
        duration: item.duration,
        movie: item.movie as MediaItem,
      })) ?? [];

  return (
    <div className="pb-12">
      {heroMovies === undefined ? <HeroSkeleton /> : <HeroCarousel movies={heroMovies} />}

      <div className="container mx-auto px-4 py-10 space-y-12 md:space-y-16">
        {user && continueItems.length > 0 && (
          <ContinueWatchingRow
            items={continueItems}
            className="section-alt rounded-lg py-6 px-2 -mx-2"
          />
        )}

        <MovieRow
          title="Tendencias"
          subtitle="Lo más popular ahora"
          movies={trending}
          isLoading={trending === undefined}
          href="/movies"
        />

        <MovieRow
          title="Series"
          subtitle="Maratón garantizado"
          movies={series}
          isLoading={series === undefined}
          href="/series"
          linkLabel="Ver series"
        />

        {topGenres.map((genre, idx) => {
          const genreMovies = (movies ?? [])
            .filter((m) =>
              (m.genre ?? '')
                .split(',')
                .map((g) => g.trim())
                .includes(genre)
            )
            .slice(0, 12);
          if (genreMovies.length === 0 && movies !== undefined) return null;
          return (
            <div
              key={genre}
              className={cn(idx % 2 === 1 && 'section-alt rounded-lg py-6 px-2 -mx-2')}
            >
              <MovieRow
                title={genre}
                movies={genreMovies}
                isLoading={movies === undefined}
                href={`/movies?genre=${encodeURIComponent(genre)}`}
              />
            </div>
          );
        })}

        <section className="space-y-4">
          <SectionHeader
            title="Explorar por género"
            subtitle="Desliza y descubre por tu género favorito"
          />
          <GenreSwiper>
            {(genres ?? []).map((genre) => (
              <GenreChip
                key={genre}
                href={`/movies?genre=${encodeURIComponent(genre)}`}
                label={genre}
                gradient={genreColors[genre]}
              />
            ))}
          </GenreSwiper>
        </section>
      </div>
    </div>
  );
}
