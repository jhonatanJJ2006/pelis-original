'use client';

import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import { Tv } from 'lucide-react';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { api } from '@pelis/convex';
import { Spinner } from '@pelis/ui/components';
import type { MediaItem } from '@pelis/ui/types';

const classificationLabels: Record<string, string> = {
  G: 'Para toda la familia',
  PG: 'Guía paternal sugerida',
  'PG-13': 'Mayores de 13 años',
  R: 'Mayores de 17 años',
  'NC-17': 'Solo adultos',
};

export default function SeriesPage() {
  const series = useQuery(api.movies.listSeries, {}) as MediaItem[] | undefined;
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
      const order = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [series]);

  return (
    <div className="page-shell">
      <ScrollReveal className="mb-10">
        <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
          Catálogo
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase">
          Series
        </h1>
        <p className="text-cinema-muted mt-3 max-w-2xl">
          {series ? `${series.length} series disponibles` : 'Cargando...'}
        </p>
      </ScrollReveal>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" role="status" aria-label="Cargando">
          <Spinner size="lg" />
        </div>
      ) : series.length === 0 ? (
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
                {items.map((s) => (
                  <MovieCard key={s._id} movie={s} />
                ))}
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
