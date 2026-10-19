'use client';

import type { PreloadedQuery } from '@pelis/db/server';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tv } from 'lucide-react';
import { MovieCard } from '@pelis/ui/features/movie-card';
import { EmptyState, ErrorState } from '@pelis/ui/features/empty-state';
import { CatalogPageSkeleton } from '@pelis/ui/features/catalog-page-skeleton';
import { Paginator, type PageResult } from '@pelis/ui/features/paginator';
import { useQueryResult } from '@pelis/db/client';
import { api } from '@pelis/db/api';
import type { MediaItem } from '@pelis/ui/types';

export const SERIES_PAGE_SIZE = 30;

interface SeriesPageClientProps {
  preloaded: { series: PreloadedQuery<PageResult<MediaItem>> };
  initialPage: number;
}

export default function SeriesPageClient({ preloaded, initialPage }: SeriesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPage] = useState(initialPage);
  useEffect(() => {
    router.replace(page > 1 ? `${pathname}?page=${page}` : pathname, { scroll: false });
  }, [page, pathname, router]);

  const {
    data: live,
    error,
    isLoading,
    refetch,
  } = useQueryResult<PageResult<MediaItem>>(api.movies.page, {
    mediaType: 'series' as const,
    limit: SERIES_PAGE_SIZE,
    offset: (page - 1) * SERIES_PAGE_SIZE,
  });
  const result = live ?? (page === initialPage ? preloaded.series.data : undefined);

  if (!result && error) {
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
  if (!result && isLoading && page === initialPage) {
    return <CatalogPageSkeleton showFilters={false} />;
  }

  const items = result?.items ?? [];
  const total = result?.total ?? 0;

  return (
    <div className="page-shell">
      <div className="mb-10">
        <p className="text-label uppercase text-cinema-accent mb-2">Catálogo</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk">
            Series
          </h1>
          {result && (
            <span className="shrink-0 border border-cinema-accent/40 bg-cinema-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cinema-accent">
              {total} series
            </span>
          )}
        </div>
        <p className="text-cinema-muted mt-3 max-w-2xl">
          Series para maratonear, con temporadas completas.
        </p>
      </div>

      {!result ? (
        <div className="py-16 text-center text-cinema-muted" role="status">
          Cargando…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Tv}
          title="La sala de series se está preparando"
          description="Todavía no hay series en el catálogo. Mientras tanto, explora películas, anime y TV en vivo."
          actionLabel="Ver películas"
          actionHref="/movies"
        />
      ) : (
        <section aria-busy={isLoading}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {items.map((s) => (
              <MovieCard key={s._id} movie={s} />
            ))}
          </div>
          <Paginator
            page={page}
            total={total}
            pageSize={SERIES_PAGE_SIZE}
            onPageChange={setPage}
            noun="series"
          />
        </section>
      )}
    </div>
  );
}
