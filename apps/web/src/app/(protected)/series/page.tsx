'use client';

import { useQuery } from 'convex/react';
import { Tv } from 'lucide-react';
import { MovieRow } from '@pelis/ui/features/movie-row';
import { MovieSwiper } from '@pelis/ui/features/movie-swiper';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { api } from '@pelis/convex';
import { Spinner } from '@pelis/ui/components';
import type { MediaItem } from '@pelis/ui/types';

export default function SeriesPage() {
  const series = useQuery(api.movies.listSeries, {}) as MediaItem[] | undefined;
  const isLoading = series === undefined;

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
          Temporadas completas para maratonear. Desliza el carrusel para descubrir más.
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
        <>
          <ScrollReveal className="mb-14">
            <MovieSwiper movies={series} slideWidth="lg" />
          </ScrollReveal>
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
