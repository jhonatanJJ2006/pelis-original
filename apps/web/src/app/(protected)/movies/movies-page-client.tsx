'use client';

import { useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { MovieSwiper } from '@pelis/ui/features/movie-swiper';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
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
        <ScrollReveal>
          <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
            Catálogo
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-2">
            Películas
          </h1>
          <p className="text-cinema-muted mb-8">Desliza para explorar el catálogo completo</p>
        </ScrollReveal>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <label htmlFor="movies-search" className="sr-only">
              Buscar películas
            </label>
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cinema-ash"
              aria-hidden
            />
            <input
              id="movies-search"
              type="search"
              placeholder="Buscar por título, actor o género..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-12"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <label htmlFor="genre-filter" className="sr-only">
              Filtrar por género
            </label>
            <select
              id="genre-filter"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="input-field w-auto min-w-[160px] cursor-pointer"
            >
              <option value="">Todos los géneros</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <label htmlFor="year-filter" className="sr-only">
              Filtrar por año
            </label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field w-auto min-w-[140px] cursor-pointer"
            >
              <option value="">Todos los años</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
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
        <div className="flex items-center justify-center py-24" role="status" aria-label="Cargando">
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
        <ScrollReveal>
          <p className="text-cinema-silver text-sm mb-6">{movies.length} películas encontradas</p>
          <MovieSwiper movies={movies} slideWidth="lg" />
        </ScrollReveal>
      )}
    </div>
  );
}
