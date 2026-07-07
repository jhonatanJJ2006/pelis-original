'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Play, Info, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useUser } from '@pelis/auth/hooks';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { ContinueWatchingCard } from '@pelis/ui/features/continue-watching-card';
import { SectionHeader } from '@pelis/ui/features/section-header';
import { api } from '@pelis/convex';
import { useState } from 'react';
import type { MediaItem } from '@pelis/ui/types';

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

  const hasActivePlan = user?.planExpiresAt && user.planExpiresAt > Date.now();
  const [heroIndex, setHeroIndex] = useState(0);

  const hero = featuredMovies[heroIndex];
  const topGenres = genres.slice(0, 4);

  return (
    <div className="animate-fade-in pb-12">
      {hero && (
        <section className="relative h-[70vh] min-h-[480px] max-h-[820px] overflow-hidden group cinema-grain">
          <MoviePoster
            src={hero.image}
            alt={hero.name}
            className="w-full h-full object-cover animate-hero-zoom"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cinema-bg via-cinema-bg/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/20 to-transparent" />

          <button
            type="button"
            onClick={() => setHeroIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/70"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setHeroIndex((prev) => (prev + 1) % featuredMovies.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/70"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14 lg:p-20">
            <div className="container mx-auto max-w-4xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cinema-accent/90 text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" />
                  Destacado
                </span>
                <span className="text-sm text-zinc-400">{hero.genre} · {hero.releaseYear}</span>
              </div>
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wide text-white uppercase leading-[0.95] mb-5">
                {hero.name}
              </h1>
              <p className="text-zinc-300 text-base md:text-lg mb-8 max-w-xl line-clamp-3 leading-relaxed">
                {hero.synopsis}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/movies/${hero._id}?play=true`}>
                  <button className="btn-primary flex items-center gap-2 px-7 py-3.5 text-base">
                    <Play className="w-5 h-5" fill="currentColor" />
                    Reproducir
                  </button>
                </Link>
                <Link href={`/movies/${hero._id}`}>
                  <button className="btn-secondary flex items-center gap-2 px-7 py-3.5 text-base backdrop-blur-sm">
                    <Info className="w-5 h-5" />
                    Más info
                  </button>
                </Link>
                {!hasActivePlan && (
                  <Link href="/subscribe">
                    <button className="px-7 py-3.5 rounded-lg font-bold bg-cinema-gold text-black hover:bg-cinema-gold-light transition-all">
                      Premium
                    </button>
                  </Link>
                )}
              </div>

              {featuredMovies.length > 1 && (
                <div className="flex items-center gap-2 mt-8">
                  {featuredMovies.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setHeroIndex(i)}
                      className={`h-1 rounded-full transition-all ${
                        i === heroIndex ? 'w-10 bg-cinema-accent' : 'w-4 bg-zinc-600 hover:bg-zinc-500'
                      }`}
                      aria-label={`Ir al destacado ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-10 space-y-12 md:space-y-14">
        {user && continueWatching && continueWatching.length > 0 && (
          <section>
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

        {topGenres.map((genre) => {
          const genreMovies = movies.filter((m) => m.genre === genre).slice(0, 12);
          if (genreMovies.length === 0) return null;
          return (
            <MovieRow
              key={genre}
              title={genre}
              movies={genreMovies}
              href={`/movies?genre=${encodeURIComponent(genre)}`}
            />
          );
        })}

        <section>
          <SectionHeader title="Explorar por género" />
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Link
                key={genre}
                href={`/movies?genre=${encodeURIComponent(genre)}`}
                className="px-4 py-2.5 bg-cinema-surface hover:bg-cinema-accent/10 border border-cinema-border hover:border-cinema-accent/40 rounded-full text-sm text-zinc-300 hover:text-white transition-all"
              >
                {genre}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
