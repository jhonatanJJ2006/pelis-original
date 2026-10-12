'use client';

import type { PreloadedQuery } from '@pelis/db/server';
import { useMemo } from 'react';
import { Tv } from 'lucide-react';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { EmptyState, ErrorState } from '@pelis/ui/features/empty-state';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import { useQueryResult } from '@pelis/db/client';
import { api } from '@pelis/db/api';
import type { MediaItem } from '@pelis/ui/types';

const classificationOrder = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

const classificationLabels: Record<string, string> = {
  G: 'Para toda la familia',
  PG: 'Guía paternal sugerida',
  'PG-13': 'Mayores de 13 años',
  R: 'Mayores de 17 años',
  'NC-17': 'Solo adultos',
};

interface SeriesPageClientProps {
  preloaded: {
    series: PreloadedQuery<MediaItem[]>;
  };
}

export default function SeriesPageClient({ preloaded }: SeriesPageClientProps) {
  const {
    data: liveSeries,
    error: seriesError,
    isLoading: seriesLoading,
    refetch,
  } = useQueryResult<MediaItem[]>(api.movies.listSeries, {});
  const series = liveSeries ?? preloaded.series.data;
  const isLoading = series === undefined && seriesLoading;

  const grouped = useMemo(() => {
    if (!series) return [];
    const groups: Record<string, MediaItem[]> = {};
    for (const s of series) {
      const key = s.classification || 'Otros';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      const ia = classificationOrder.indexOf(a);
      const ib = classificationOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [series]);

  if (isLoading) {
    return <CatalogPageSkeleton showFilters={false} />;
  }

  if (!series && seriesError) {
    return (
      <div className="page-shell">
        <ErrorState
          title="No se pudieron cargar las series"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!series) {
    return <CatalogPageSkeleton showFilters={false} />;
  }

  return (
    <div className="page-shell">
      <div className="mb-10">
        <p className="text-label uppercase text-cinema-accent mb-2">Catálogo Maison Noir</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk">
            Series
          </h1>
          <span className="shrink-0 border border-cinema-accent/40 bg-cinema-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cinema-accent">
            {series.length} series
          </span>
        </div>
        <p className="text-cinema-muted mt-3 max-w-2xl">
          Series para maratonear, con temporadas completas.
        </p>
      </div>

      {series.length === 0 ? (
        <EmptyState
          icon={Tv}
          title="La sala de series se está preparando"
          description="Todavía no hay series en el catálogo. Mientras tanto, explora películas, anime y TV en vivo."
          actionLabel="Ver películas"
          actionHref="/movies"
        />
      ) : (
        <div className="space-y-10">
          {grouped.map(([classification, items]) => (
            <MovieRow
              key={classification}
              title={classification}
              subtitle={`${classificationLabels[classification] ?? ''} · ${items.length} ${items.length === 1 ? 'título' : 'títulos'}`.trim()}
              movies={items}
            />
          ))}
        </div>
      )}
    </div>
  );
}
