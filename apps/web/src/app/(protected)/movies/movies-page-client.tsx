'use client';

import { useQuery } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { CatalogFilterBar } from '@pelis/ui/features/catalog-filter-bar';
import { api } from '@pelis/convex';
import { Spinner } from '@pelis/ui/components';
import type { MediaItem } from '@pelis/ui/types';

const classificationOrder = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

const classificationLabels: Record<string, string> = {
  G: 'Para toda la familia',
  PG: 'Guía paternal sugerida',
  'PG-13': 'Mayores de 13 años',
  R: 'Mayores de 17 años',
  'NC-17': 'Solo adultos',
};

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

  const grouped = useMemo(() => {
    if (!movies) return [];
    const groups: Record<string, MediaItem[]> = {};
    for (const m of movies) {
      const key = m.classification || 'Otros';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      const ia = classificationOrder.indexOf(a);
      const ib = classificationOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [movies]);

  const hasFilters = Boolean(selectedGenre || selectedYear || search);

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
          <p className="text-cinema-muted mb-8">
            {movies ? `${movies.length} películas disponibles` : 'Cargando...'}
          </p>
        </ScrollReveal>

        <CatalogFilterBar
          searchId="movies-search"
          searchLabel="Buscar películas"
          searchPlaceholder="Buscar por título, actor o género..."
          search={search}
          onSearchChange={setSearch}
          showClear={hasFilters}
          onClear={() => {
            setSelectedGenre('');
            setSelectedYear('');
            setSearch('');
          }}
          selects={[
            {
              id: 'genre-filter',
              label: 'Filtrar por género',
              placeholder: 'Todos los géneros',
              value: selectedGenre,
              onChange: setSelectedGenre,
              options: genres.map((genre) => ({ value: genre, label: genre })),
            },
            {
              id: 'year-filter',
              label: 'Filtrar por año',
              placeholder: 'Todos los años',
              value: selectedYear,
              onChange: setSelectedYear,
              minWidth: 'min-w-[140px]',
              options: years.map((year) => ({ value: year, label: year })),
            },
          ]}
        />
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
      ) : hasFilters ? (
        <ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        </ScrollReveal>
      ) : (
        <div className="space-y-10">
          {grouped.map(([classification, items]) => (
            <ScrollReveal key={classification}>
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="font-display text-2xl tracking-wide text-white uppercase">
                  {classification}
                </h2>
                <span className="text-sm text-cinema-muted hidden sm:inline">
                  {classificationLabels[classification] || ''}
                </span>
                <span className="text-xs text-cinema-ash ml-auto">
                  {items.length} {items.length === 1 ? 'título' : 'títulos'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {items.map((movie) => (
                  <MovieCard key={movie._id} movie={movie} />
                ))}
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
