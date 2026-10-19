'use client';

import { useQueryResult } from '@pelis/db/client';
import type { PreloadedQuery } from '@pelis/db/server';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { SectionHeader } from '@pelis/ui/features/section-header';
import { EmptyState, ErrorState } from '@pelis/ui/features/empty-state';
import { CatalogFilterBar } from '@pelis/ui/features/catalog-filter-bar';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import { Paginator, type PageResult } from '@pelis/ui/features/paginator';
import { api } from '@pelis/db/api';
import type { MediaItem } from '@pelis/ui/types';

import { MOVIES_PAGE_SIZE } from './page-size';

interface MoviesPageClientProps {
  preloaded: {
    movies: PreloadedQuery<PageResult<MediaItem>>;
    genres: PreloadedQuery<string[]>;
    years: PreloadedQuery<string[]>;
  };
  initial: { search: string; genre: string; year: string; page: number };
}

export default function MoviesPageClient({ preloaded, initial }: MoviesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(initial.search);
  const [selectedGenre, setSelectedGenre] = useState(initial.genre);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [page, setPage] = useState(initial.page);
  const firstFilters = useRef(true);

  useEffect(() => {
    setSearch(initial.search);
    setSelectedGenre(initial.genre);
    setSelectedYear(initial.year);
    setPage(initial.page);
  }, [initial]);

  // Al cambiar un filtro se vuelve a la página 1.
  useEffect(() => {
    if (firstFilters.current) {
      firstFilters.current = false;
      return;
    }
    setPage(1);
  }, [selectedGenre, selectedYear, search]);

  // La página vive en la URL (?page=) para poder compartirla y volver atrás.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedGenre) params.set('genre', selectedGenre);
    if (selectedYear) params.set('year', selectedYear);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [page, search, selectedGenre, selectedYear, pathname, router]);

  const hasFilters = Boolean(selectedGenre || selectedYear || search);
  const isInitialArgs =
    search === initial.search &&
    selectedGenre === initial.genre &&
    selectedYear === initial.year &&
    page === initial.page;

  const {
    data: liveMovies,
    error: moviesError,
    isLoading: moviesLoading,
    refetch,
  } = useQueryResult<PageResult<MediaItem>>(api.movies.page, {
    genre: selectedGenre || undefined,
    year: selectedYear || undefined,
    search: search || undefined,
    // Una búsqueda de texto incluye series; el catálogo por género/año, solo películas.
    mediaType: search.trim() ? undefined : ('movie' as const),
    limit: MOVIES_PAGE_SIZE,
    offset: (page - 1) * MOVIES_PAGE_SIZE,
  });

  const result = liveMovies ?? (isInitialArgs ? preloaded.movies.data : undefined);
  const genres = (preloaded.genres.data as string[] | undefined) ?? [];
  const years = (preloaded.years.data as string[] | undefined) ?? [];

  if (!result && moviesError) {
    return (
      <div className="page-shell">
        <ErrorState
          title="No se pudo cargar el catálogo"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!result && moviesLoading && isInitialArgs) {
    return <CatalogPageSkeleton />;
  }

  const movies = result?.items ?? [];
  const total = result?.total ?? 0;

  return (
    <div className="page-shell">
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-8">
          <div>
            <p className="text-label uppercase text-cinema-accent mb-2 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
              Cinémathèque PELIS
            </p>
            <h1 className="font-display italic text-4xl md:text-5xl tracking-tight text-cinema-chalk">
              Películas
            </h1>
          </div>
          {result && <p className="text-meta text-cinema-muted">{total} títulos disponibles</p>}
        </div>

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
              variant: 'chips',
              placeholder: 'Todos',
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

      {!result ? (
        <div className="py-16 text-center text-cinema-muted" role="status">
          Cargando…
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
        <section aria-busy={moviesLoading}>
          <SectionHeader
            title={hasFilters ? 'Resultados' : 'Todas las películas'}
            subtitle={`${total} ${total === 1 ? 'título' : 'títulos'}`}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
          <Paginator page={page} total={total} pageSize={MOVIES_PAGE_SIZE} onPageChange={setPage} />
        </section>
      )}
    </div>
  );
}
