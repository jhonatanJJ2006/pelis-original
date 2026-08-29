'use client';

import type { PreloadedQuery } from '@pelis/db/server';
import { useMemo } from 'react';
import { Tv } from 'lucide-react';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import { useQuery } from '@pelis/db/client';
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
  const liveSeries = useQuery<MediaItem[]>(api.movies.listSeries, {}) as MediaItem[] | undefined;
  const series = liveSeries ?? preloaded.series.data;
  const isLoading = series === undefined;

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

  return (
    <div className="page-shell">
      <div className="mb-10">
        <p className="text-cinema-accent text-sm font-medium uppercase tracking-widest mb-2">
          Catálogo
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk">
          Series
        </h1>
        <p className="text-cinema-muted mt-3 max-w-2xl">{series.length} series disponibles</p>
      </div>

      {series.length === 0 ? (
        <EmptyState
          icon={Tv}
          title="Sin series disponibles"
          description="Pronto añadiremos más series al catálogo."
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
