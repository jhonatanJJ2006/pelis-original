'use client';

import { useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { api } from '@pelis/convex';
import { Spinner } from '@pelis/ui/components';
import type { MediaItem } from '@pelis/ui/types';

export default function MoviesPageClient() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
    setSelectedGenre(searchParams.get('genre') ?? '');
    setSelectedYear(searchParams.get('year') ?? '');
  }, [searchParams]);

  const movies = useQuery(api.movies.list, {
    genre: selectedGenre || undefined,
    year: selectedYear || undefined,
    search: search || undefined,
    mediaType: 'movie',
  }) as MediaItem[] | undefined;

  const genres = (useQuery(api.movies.getGenres, {}) as string[] | undefined) ?? [];
  const years = (useQuery(api.movies.getYears, {}) as string[] | undefined) ?? [];

  const isLoading = movies === undefined;

  return (
    <div className="page-shell">
      <div className="mb-10">
        <p className="text-cinema-gold text-sm font-medium uppercase tracking-widest mb-2">
          Catálogo
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-8">
          Películas
        </h1>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="search"
              placeholder="Buscar por título, actor o género..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-12"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="input-field w-auto min-w-[160px] cursor-pointer"
            >
              <option value="">Todos los géneros</option>
              {genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field w-auto min-w-[140px] cursor-pointer"
            >
              <option value="">Todos los años</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {(selectedGenre || selectedYear || search) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGenre('');
                  setSelectedYear('');
                  setSearch('');
                }}
                className="px-4 py-2 text-sm text-cinema-gold hover:text-cinema-gold-light transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : movies.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Sin resultados"
          description="Prueba con otros filtros o términos de búsqueda."
          actionLabel="Ver todo el catálogo"
          actionHref="/movies"
        />
      ) : (
        <>
          <p className="text-zinc-500 text-sm mb-6">{movies.length} películas encontradas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
