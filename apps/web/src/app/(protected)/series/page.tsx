'use client';

import { useQuery } from 'convex/react';
import { Tv } from 'lucide-react';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { api } from '@pelis/convex';
import { Spinner } from '@pelis/ui/components';
import type { MediaItem } from '@pelis/ui/types';

export default function SeriesPage() {
  const series = (useQuery(api.movies.listSeries, {}) as MediaItem[] | undefined);
  const isLoading = series === undefined;

  return (
    <div className="page-shell">
      <div className="mb-10">
        <p className="text-cinema-gold text-sm font-medium uppercase tracking-widest mb-2">
          Catálogo
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase">
          Series
        </h1>
        <p className="text-zinc-400 mt-3 max-w-2xl">
          Temporadas completas para maratonear. Guarda tus favoritas y retoma donde las dejaste.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-14">
            {series.map((item) => (
              <MovieCard key={item._id} movie={item} />
            ))}
          </div>
          <MovieRow
            title="Recomendadas"
            subtitle="Basadas en lo más visto"
            movies={series.slice().reverse()}
          />
        </>
      )}
    </div>
  );
}
