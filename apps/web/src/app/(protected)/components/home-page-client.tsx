'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Film, Search, Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUser } from '@pelis/auth/hooks';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { api } from '@pelis/convex';
import { useState } from 'react';

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

  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const nextHero = () => {
    setHeroIndex((prev) => (prev + 1) % featuredMovies.length);
  };

  const prevHero = () => {
    setHeroIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length);
  };

  const filteredMovies = searchQuery
    ? movies.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.genre.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : movies;

  return (
    <div className="animate-fade-in pb-8">
      {featuredMovies.length > 0 && (
        <section className="relative h-[60vh] md:h-[80vh] overflow-hidden group">
          <img
            src={featuredMovies[heroIndex].image}
            alt={featuredMovies[heroIndex].name}
            className="w-full h-full object-cover transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-400 via-dark-400/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-400 via-transparent to-transparent" />

          <button
            onClick={prevHero}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-dark-100/60 hover:bg-dark-100/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextHero}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-dark-100/60 hover:bg-dark-100/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <div className="container mx-auto">
              <span className="inline-block px-3 py-1 bg-primary-600/80 text-white text-sm rounded-full mb-4 backdrop-blur-sm">
                {featuredMovies[heroIndex].genre}
              </span>
              <h1 className="text-4xl md:text-6xl font-bold mb-4 max-w-2xl">
                {featuredMovies[heroIndex].name}
              </h1>
              <p className="text-slate-300 text-lg mb-6 max-w-xl line-clamp-2">
                {featuredMovies[heroIndex].synopsis}
              </p>
              <div className="flex items-center gap-4">
                <Link href={`/movies/${featuredMovies[heroIndex]._id}`}>
                  <button className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                    <Play className="w-5 h-5" fill="currentColor" /> Reproducir
                  </button>
                </Link>
                <Link href={`/movies/${featuredMovies[heroIndex]._id}`}>
                  <button className="bg-dark-100/80 hover:bg-dark-100 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors border border-slate-600 backdrop-blur-sm">
                    <Info className="w-5 h-5" /> M&aacute;s informaci&oacute;n
                  </button>
                </Link>
                {!hasActivePlan && (
                  <Link href="/subscribe">
                    <button className="bg-yellow-500/80 hover:bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 backdrop-blur-sm">
                      Suscribirse
                    </button>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2 mt-6">
                {featuredMovies.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === heroIndex
                        ? 'w-8 bg-primary-500'
                        : 'w-4 bg-slate-600 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar pel&iacute;culas por nombre o g&eacute;nero..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-200 border border-slate-700 rounded-xl py-3.5 pl-12 pr-16 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              &times;
            </button>
          )}
        </div>
      </section>

      {!searchQuery && (
        <section className="container mx-auto px-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Explorar por g&eacute;nero</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Link
                key={genre}
                href={`/movies?genre=${encodeURIComponent(genre)}`}
                className="px-4 py-2 bg-dark-200 hover:bg-primary-600/20 border border-slate-800 hover:border-primary-500/50 rounded-full text-sm transition-all"
              >
                {genre}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {searchQuery ? 'Resultados' : 'Todas las pel&iacute;culas'}
          </h2>
          <Link
            href="/movies"
            className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors"
          >
            Ver todas
          </Link>
        </div>
        {filteredMovies.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No se encontraron pel&iacute;culas</h3>
            <p className="text-slate-400">Intenta con otros t&eacute;rminos de b&uacute;squeda</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMovies.slice(0, 12).map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
