'use client';

import { useQuery, useMutation } from 'convex/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clapperboard, Star, Film, Search, ChevronDown } from 'lucide-react';
import { api } from '@pelis/convex';
import { Spinner, Button } from '@pelis/ui/components';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
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
    status: (selectedStatus as any) || undefined,
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

  const filteredBySearch = search
    ? anime.filter((a) => {
        const q = search.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.alternativeTitle?.toLowerCase().includes(q) ||
          a.genre.some((g) => g.toLowerCase().includes(q))
        );
      })
    : anime;

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

      <div className="flex flex-col lg:flex-row gap-4 mb-10">
        <div className="flex-1 relative">
          <label htmlFor="anime-search" className="sr-only">
            Buscar anime
          </label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cinema-ash" />
          <input
            id="anime-search"
            type="search"
            placeholder="Buscar por título o género..."
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

          <label htmlFor="status-filter" className="sr-only">
            Filtrar por estado
          </label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field w-auto min-w-[160px] cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="ongoing">En emisión</option>
            <option value="completed">Finalizado</option>
          </select>

          {(selectedGenre || selectedStatus || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedGenre('');
                setSelectedStatus('');
                setSearch('');
              }}
              className="px-4 py-2 text-sm text-cinema-gold hover:text-cinema-gold-light transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" role="status" aria-label="Cargando">
          <Spinner size="lg" />
        </div>
      ) : filteredBySearch.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Sin resultados"
          description="No encontramos animes con esos filtros."
          actionLabel="Ver todo"
          actionHref="/anime"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {filteredBySearch.map((a) => (
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
                <div className="flex items-center gap-2 text-[11px] text-cinema-ash">
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
