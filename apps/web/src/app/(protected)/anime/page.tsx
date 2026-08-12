'use client';

import { useQuery, useMutation } from '@pelis/db/client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clapperboard, Star } from 'lucide-react';
import { api } from '@pelis/db/api';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { CatalogFilterBar } from '@pelis/ui/features/catalog-filter-bar';
import { cn } from '@pelis/ui/utils';

interface AnimeItem {
  _id: string;
  title: string;
  alternativeTitle?: string;
  image: string;
  synopsis: string;
  genre: string[];
  episodes: number;
  status: 'ongoing' | 'completed';
  year: number;
  rating?: number;
}

export default function AnimePage() {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const animeList = useQuery(api.anime.list, {
    search: search || undefined,
    genre: selectedGenre || undefined,
    status: (selectedStatus as 'ongoing' | 'completed' | undefined) || undefined,
  }) as AnimeItem[] | undefined;
  const genres = (useQuery(api.anime.getGenres, {}) as string[] | undefined) ?? [];
  const seedAnime = useMutation(api.anime.seed);
  const [seeding, setSeeding] = useState(false);

  const isLoading = animeList === undefined;

  useEffect(() => {
    if (animeList && animeList.length === 0 && !seeding) {
      setSeeding(true);
      seedAnime().catch(() => {});
    }
  }, [animeList, seedAnime, seeding]);

  const anime = animeList ?? [];
  const hasFilters = Boolean(selectedGenre || selectedStatus || search);

  return (
    <div className="page-shell">
      <ScrollReveal className="mb-10">
        <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
          Catálogo
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase">
          Anime
        </h1>
        <p className="text-cinema-muted mt-3 max-w-2xl">
          {anime.length > 0 ? `${anime.length} animes disponibles` : 'Cargando catálogo...'}
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
      ) : anime.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Sin resultados"
          description="No encontramos animes con esos filtros."
          actionLabel="Ver todo"
          actionHref="/anime"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {anime.map((a) => (
            <Link
              key={a._id}
              href={`/anime/${a._id}`}
              className="group flex flex-col rounded-2xl overflow-hidden bg-cinema-surface border border-cinema-border hover:border-cinema-violet/40 transition-all hover:-translate-y-1"
            >
              <div className="aspect-[3/4] overflow-hidden bg-cinema-elevated">
                <img
                  src={a.image}
                  alt={a.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">
                  {a.title}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-cinema-silver">
                  {a.rating && (
                    <span className="flex items-center gap-0.5 text-cinema-gold">
                      <Star className="w-3 h-3" />
                      {a.rating}
                    </span>
                  )}
                  <span>{a.episodes} eps</span>
                  <span
                    className={cn(
                      'px-1 py-0.5 rounded text-[10px] font-medium uppercase',
                      a.status === 'ongoing'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-cinema-elevated text-cinema-silver'
                    )}
                  >
                    {a.status === 'ongoing' ? 'En emisión' : 'Finalizado'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
