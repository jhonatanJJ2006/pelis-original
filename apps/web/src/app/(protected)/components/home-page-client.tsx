'use client';

import Link from 'next/link';
import { useQuery, usePreloadedQuery, type Preloaded } from 'convex/react';
import { useUser } from '@pelis/auth/hooks';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { ContinueWatchingRow } from '@pelis/ui/features/continue-watching-row';
import { SectionHeader } from '@pelis/ui/features/section-header';
import { GenreSwiper, GenreChip } from '@pelis/ui/features/genre-swiper';
import { HeroCarousel } from './hero-carousel';
import { api } from '@pelis/convex';
import type { MediaItem } from '@pelis/ui/types';
import { cn } from '@pelis/ui/utils';

const genreColors: Record<string, string> = {
  Acción: 'from-red-500/30 to-cinema-violet/15',
  Comedia: 'from-yellow-400/25 to-cinema-violet/15',
  Drama: 'from-blue-500/30 to-cinema-teal/15',
  Terror: 'from-emerald-500/25 to-cinema-violet/15',
  Romance: 'from-pink-500/25 to-cinema-violet/15',
  Ciencia: 'from-cyan-500/25 to-cinema-violet/15',
  Suspenso: 'from-orange-500/25 to-cinema-violet/15',
  Aventura: 'from-teal-500/25 to-cinema-violet/15',
  Animación: 'from-blue-400/30 to-cinema-teal/15',
};

interface HomePageClientProps {
  preloaded: {
    featured: Preloaded<typeof api.movies.getFeatured>;
    trending: Preloaded<typeof api.movies.getTrending>;
    movies: Preloaded<typeof api.movies.list>;
    series: Preloaded<typeof api.movies.listSeries>;
    genres: Preloaded<typeof api.movies.getGenres>;
  };
}

export function HomePageClient({ preloaded }: HomePageClientProps) {
  const { user } = useUser();
  const movies =
    (usePreloadedQuery(preloaded.movies) as MediaItem[] | undefined) ?? [];
  const featuredMovies =
    (usePreloadedQuery(preloaded.featured) as MediaItem[] | undefined) ?? [];
  const trending =
    (usePreloadedQuery(preloaded.trending) as MediaItem[] | undefined) ?? [];
  const series =
    (usePreloadedQuery(preloaded.series) as MediaItem[] | undefined) ?? [];
  const genres =
    (usePreloadedQuery(preloaded.genres) as string[] | undefined) ?? [];
  const continueWatching = useQuery(
    api.history.getContinueWatching,
    user ? { userId: user._id as any, limit: 10 } : 'skip'
  );

  const topGenres = genres.slice(0, 4);

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
      <HeroCarousel movies={featuredMovies} />

      <div className="container mx-auto px-4 py-10 space-y-12 md:space-y-16">
        {user && continueItems.length > 0 && (
          <ContinueWatchingRow
            items={continueItems}
            className="section-alt rounded-2xl py-6 px-2 -mx-2"
          />
        )}

        <MovieRow
          title="Tendencias"
          subtitle="Lo más popular ahora"
          movies={trending}
          href="/movies"
        />

        <MovieRow
          title="Series"
          subtitle="Maratón garantizado"
          movies={series}
          href="/series"
          linkLabel="Ver series"
        />

        {topGenres.map((genre, idx) => {
          const genreMovies = movies.filter((m) => m.genre === genre).slice(0, 12);
          if (genreMovies.length === 0) return null;
          return (
            <div
              key={genre}
              className={cn(idx % 2 === 1 && 'section-alt rounded-2xl py-6 px-2 -mx-2')}
            >
              <MovieRow
                title={genre}
                movies={genreMovies}
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
            {genres.map((genre) => (
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
