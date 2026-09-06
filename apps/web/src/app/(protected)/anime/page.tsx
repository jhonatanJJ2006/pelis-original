'use client';

import { useQueryResult, useMutation } from '@pelis/db/client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Clapperboard, Star, Layers, Film } from 'lucide-react';
import { api } from '@pelis/db/api';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import { EmptyState, ErrorState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { CatalogFilterBar } from '@pelis/ui/features/catalog-filter-bar';
import { RemoteImage } from '@/components/remote-image';
import { cn } from '@pelis/ui/utils';

interface AnimeSeriesCard {
  _id: string;
  seriesKey: string;
  title: string;
  alternativeTitle?: string;
  image: string;
  synopsis: string;
  genre: string[];
  year: number;
  latestYear: number;
  rating?: number;
  status: 'ongoing' | 'completed';
  seasonCount: number;
  extrasCount: number;
  entryCount: number;
  totalEpisodes: number;
}

/** "2013" for a single year, "2013 – 2021" for a franchise spanning several. */
function formatYearRange(from: number, to: number): string {
  return from === to ? String(from) : `${from} – ${to}`;
}

export default function AnimePage() {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const {
    data: seriesList,
    error: seriesError,
    isLoading,
    refetch,
  } = useQueryResult<AnimeSeriesCard[]>(api.anime.listSeries, {
    search: search || undefined,
    genre: selectedGenre || undefined,
    status: (selectedStatus as 'ongoing' | 'completed' | undefined) || undefined,
  });
  const { data: genresData } = useQueryResult<string[]>(api.anime.getGenres, {});
  const genres = genresData ?? [];
  const seedAnime = useMutation(api.anime.seed);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (
      seriesList &&
      seriesList.length === 0 &&
      !seeding &&
      !search &&
      !selectedGenre &&
      !selectedStatus
    ) {
      setSeeding(true);
      seedAnime().catch(() => {});
    }
  }, [seriesList, seedAnime, seeding, search, selectedGenre, selectedStatus]);

  const series = seriesList ?? [];
  const hasFilters = Boolean(selectedGenre || selectedStatus || search);

  const summary = useMemo(() => {
    const totalEpisodes = series.reduce((sum, s) => sum + s.totalEpisodes, 0);
    const withSeasons = series.filter((s) => s.seasonCount > 1).length;
    return { totalEpisodes, withSeasons };
  }, [series]);

  return (
    <div className="page-shell">
      <ScrollReveal className="mb-10">
        <p className="text-cinema-accent text-sm font-medium uppercase tracking-widest mb-2">
          Catálogo
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk">
          Anime
        </h1>
        <p className="text-cinema-muted mt-3 max-w-2xl">
          {series.length > 0
            ? `${series.length} series · ${summary.totalEpisodes.toLocaleString('es')} episodios` +
              (summary.withSeasons > 0 ? ` · ${summary.withSeasons} con varias temporadas` : '')
            : isLoading
              ? 'Cargando catálogo…'
              : '0 series'}
        </p>
      </ScrollReveal>

      <CatalogFilterBar
        className="mb-10"
        searchId="anime-search"
        searchLabel="Buscar anime"
        searchPlaceholder="Buscar por título o género..."
        search={search}
        onSearchChange={setSearch}
        showClear={hasFilters}
        onClear={() => {
          setSelectedGenre('');
          setSelectedStatus('');
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
            id: 'status-filter',
            label: 'Filtrar por estado',
            placeholder: 'Todos',
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: 'ongoing', label: 'En emisión' },
              { value: 'completed', label: 'Finalizado' },
            ],
          },
        ]}
      />

      {isLoading ? (
        <CatalogPageSkeleton rowCount={2} />
      ) : seriesError && !seriesList ? (
        <ErrorState
          title="No se pudo cargar el anime"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={refetch}
        />
      ) : series.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Sin resultados"
          description="No encontramos animes con esos filtros."
          actionLabel="Ver todo"
          actionHref="/anime"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {series.map((s) => (
            <Link
              key={s.seriesKey}
              href={`/anime/${s._id}`}
              className="group relative flex flex-col rounded-2xl overflow-hidden bg-cinema-surface border border-cinema-border hover:border-cinema-accent/60 transition-all hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-cinema-elevated">
                <RemoteImage
                  src={s.image}
                  alt={s.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />

                {s.seasonCount > 1 && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-wide border border-white/10">
                    <Layers className="w-3 h-3" aria-hidden />
                    {s.seasonCount} temporadas
                  </span>
                )}

                {s.rating && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-cinema-gold text-[10px] font-bold border border-cinema-gold/20">
                    <Star className="w-3 h-3 fill-current" aria-hidden />
                    {s.rating}
                  </span>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-white/70">
                    <span>{formatYearRange(s.year, s.latestYear)}</span>
                    <span aria-hidden>·</span>
                    <span>{s.totalEpisodes} eps</span>
                    {s.extrasCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Film className="w-2.5 h-2.5" aria-hidden />
                        {s.extrasCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">
                  {s.title}
                </h3>
                <span
                  className={cn(
                    'self-start px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                    s.status === 'ongoing'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-cinema-elevated text-cinema-silver'
                  )}
                >
                  {s.status === 'ongoing' ? 'En emisión' : 'Finalizado'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
