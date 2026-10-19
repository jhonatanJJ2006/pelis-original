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
import { MoviePoster } from '@pelis/ui/features/movie-poster';
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
  const playableOnly = (list: MediaItem[] | undefined) => list?.filter((m) => !m.comingSoon);
  const playableFeatured = playableOnly(featuredMovies);
  const heroMovies =
    playableFeatured && playableFeatured.length > 0
      ? playableFeatured
      : featuredMovies === undefined
        ? undefined
        : (playableOnly(trending) ?? playableOnly(movies) ?? []).slice(0, 5);

  // Visitantes: landing. Con sesión: catálogo de inicio.
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
        {user && continueItems.length > 0 && <ContinueWatchingRow items={continueItems} />}

        <MovieRow
          title="Estrenos de la colección"
          subtitle="Lo más popular ahora"
          movies={trending}
          isLoading={trending === undefined}
          href="/movies"
        />

        {trending && trending.length >= 3 && (
          <section aria-labelledby="top-pelis">
            <SectionHeader title="Tendencias en Pelis" subtitle="Top 5 de la semana" />
            <h2 id="top-pelis" className="sr-only">
              Tendencias
            </h2>
            <ol className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto px-4 pb-2">
              {trending.slice(0, 5).map((movie, i) => (
                <li key={movie._id} className="flex shrink-0 items-end">
                  <span
                    aria-hidden
                    className="font-display text-[7rem] md:text-[9rem] leading-[0.8] text-transparent [-webkit-text-stroke:1px_rgba(229,194,118,0.6)] -mr-4 select-none"
                  >
                    {i + 1}
                  </span>
                  <Link
                    href={`/movies/${movie._id}`}
                    className="relative block w-[130px] md:w-[160px] aspect-[2/3] overflow-hidden rounded-[2px] border border-cinema-border/70 hover:border-cinema-accent/60 transition-colors"
                  >
                    <MoviePoster
                      src={movie.image}
                      alt={movie.name}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cinema-bg to-transparent p-2 pt-8 text-xs text-cinema-chalk line-clamp-2">
                      {movie.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        <MovieRow
          title="Series"
          subtitle="Maratón garantizado"
          movies={series}
          isLoading={series === undefined}
          href="/series"
          linkLabel="Ver series"
        />

        {topGenres.map((genre) => {
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
            <div key={genre}>
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
