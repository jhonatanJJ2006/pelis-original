'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Film, Home, Heart, History } from 'lucide-react';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { useUser } from '@pelis/auth/hooks';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { api } from '@pelis/convex';

interface Movie {
  _id: string;
  name: string;
  image: string;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
}

export function HomePageClient() {
  const { user } = useUser();
  const movies = (useQuery(api.movies.list, {}) as Movie[] | undefined) ?? [];
  const featuredMovies = (useQuery(api.movies.getFeatured, {}) as Movie[] | undefined) ?? [];
  const genres = (useQuery(api.movies.getGenres, {}) as string[] | undefined) ?? [];
  const hasActivePlan = user?.planExpiresAt && user.planExpiresAt > Date.now();

  return (
    <div className="animate-fade-in">
      {featuredMovies.length > 0 && (
        <section className="relative h-[500px] overflow-hidden">
          <div className="relative h-full">
            <img
              src={featuredMovies[0].image}
              alt={featuredMovies[0].name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-dark-400 via-dark-400/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-400 via-transparent to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
              <div className="container mx-auto">
                <span className="inline-block px-3 py-1 bg-primary-600/80 text-white text-sm rounded-full mb-4">
                  {featuredMovies[0].genre}
                </span>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 max-w-2xl">
                  {featuredMovies[0].name}
                </h1>
                <p className="text-slate-300 text-lg mb-6 max-w-xl line-clamp-2">
                  {featuredMovies[0].synopsis}
                </p>
                <div className="flex items-center gap-4">
                  <Link href={`/movies/${featuredMovies[0]._id}`}>
                    <button className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors">
                      Reproducir
                    </button>
                  </Link>
                  {!hasActivePlan && (
                    <Link href="/subscribe">
                      <button className="bg-dark-100/80 hover:bg-dark-100 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors border border-slate-600">
                        Suscribirse
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Explorar por género</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {genres.map((genre) => (
            <Link
              key={genre}
              href={`/movies?genre=${encodeURIComponent(genre)}`}
              className="px-4 py-2 bg-dark-200 hover:bg-dark-100 border border-slate-800 rounded-full text-sm transition-all hover:border-primary-500/50"
            >
              {genre}
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Todas las películas</h2>
          <Link
            href="/movies"
            className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors"
          >
            Ver todas
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.slice(0, 12).map((movie) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      </section>
    </div>
  );
}
