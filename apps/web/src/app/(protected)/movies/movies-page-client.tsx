'use client';

import { useQuery } from '@pelis/db/client';
import type { PreloadedQuery } from '@pelis/db/server';
import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { CatalogFilterBar } from '@pelis/ui/features/catalog-filter-bar';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import { api } from '@pelis/db/api';
import type { MediaItem } from '@pelis/ui/types';

const classificationOrder = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

const PAGE_SIZE = 72;

const classificationLabels: Record<string, string> = {
  G: 'Para toda la familia',
  PG: 'Guía paternal sugerida',
  'PG-13': 'Mayores de 13 años',
  R: 'Mayores de 17 años',
  'NC-17': 'Solo adultos',
};

interface MoviesPageClientProps {
  preloaded: {
    movies: PreloadedQuery<MediaItem[]>;
    genres: PreloadedQuery<string[]>;
    years: PreloadedQuery<string[]>;
  };
  initial: { search: string; genre: string; year: string };
}

export default function MoviesPageClient({ preloaded, initial }: MoviesPageClientProps) {
  const [search, setSearch] = useState(initial.search);
  const [selectedGenre, setSelectedGenre] = useState(initial.genre);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setSearch(initial.search);
    setSelectedGenre(initial.genre);
    setSelectedYear(initial.year);
  }, [initial]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedGenre, selectedYear, search]);

  const hasFilters = Boolean(selectedGenre || selectedYear || search);

  const preloadedMovies = preloaded.movies.data as MediaItem[] | undefined;
  const preloadedGenres = preloaded.genres.data as string[] | undefined;
  const preloadedYears = preloaded.years.data as string[] | undefined;

  const filteredMovies = useQuery(
    api.movies.list,
    {
      genre: selectedGenre || undefined,
      year: selectedYear || undefined,
      search: search || undefined,
      mediaType: 'movie' as const,
    }
  ) as MediaItem[] | undefined;

  const movies = filteredMovies ?? preloadedMovies;
  const genres = preloadedGenres ?? [];
  const years = preloadedYears ?? [];

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

  const visibleGroups = useMemo(() => {
    if (hasFilters) return grouped;
    let remaining = visibleCount;
    const result: typeof grouped = [];
    for (const [classification, items] of grouped) {
      if (remaining <= 0) break;
      result.push([classification, items.slice(0, remaining)]);
      remaining -= items.length;
    }
    return result;
  }, [grouped, visibleCount, hasFilters]);

  const visibleCount_ = visibleGroups.reduce((acc, [, items]) => acc + items.length, 0);
  const hasMore = !hasFilters && visibleCount_ < (movies?.length ?? 0);

  if (isLoading) {
    return <CatalogPageSkeleton />;
  }

  return (
    <div className="page-shell">
      <div className="mb-10">
        <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
          Catálogo
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-2">
          Películas
        </h1>
        <p className="text-cinema-muted mb-8">{movies.length} películas disponibles</p>

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

      {movies.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Sin resultados"
          description="Prueba con otros filtros o términos de búsqueda."
          actionLabel="Ver todo el catálogo"
          actionHref="/movies"
        />
      ) : hasFilters ? (
        <MovieRow
          title="Resultados"
          subtitle={`${movies.length} ${movies.length === 1 ? 'título' : 'títulos'}`}
          movies={movies}
        />
      ) : (
        <div className="space-y-10">
          {visibleGroups.map(([classification, items]) => (
            <MovieRow
              key={classification}
              title={classification}
              subtitle={`${classificationLabels[classification] ?? ''} · ${items.length} ${items.length === 1 ? 'título' : 'títulos'}`.trim()}
              movies={items}
            />
          ))}
          {!hasFilters && hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="btn-secondary inline-flex items-center gap-2"
              >
                Cargar más
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
