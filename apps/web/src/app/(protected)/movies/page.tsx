'use client';

import { useQuery } from 'convex/react';
import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { api } from '@pelis/convex';
import { Spinner, Input } from '@pelis/ui/components';

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

export default function MoviesPage() {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const movies = (useQuery(api.movies.list, {
    genre: selectedGenre || undefined,
    year: selectedYear || undefined,
    search: search || undefined,
  }) as Movie[] | undefined) ?? [];

  const genres = (useQuery(api.movies.getGenres, {}) as string[] | undefined) ?? [];
  const years = (useQuery(api.movies.getYears, {}) as string[] | undefined) ?? [];

  const isLoading = movies === undefined || genres === undefined;

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Pel&iacute;culas</h1>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar pel&iacute;culas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-200 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-dark-200 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
            >
              <option value="">Todos los g&eacute;neros</option>
              {genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-dark-200 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
            >
              <option value="">Todos los a&ntilde;os</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {(selectedGenre || selectedYear || search) && (
              <button
                onClick={() => {
                  setSelectedGenre('');
                  setSelectedYear('');
                  setSearch('');
                }}
                className="px-4 py-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20">
          <SlidersHorizontal className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No se encontraron pel&iacute;culas</h3>
          <p className="text-slate-400">Intenta con otros filtros o t&eacute;rminos de b&uacute;squeda</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
