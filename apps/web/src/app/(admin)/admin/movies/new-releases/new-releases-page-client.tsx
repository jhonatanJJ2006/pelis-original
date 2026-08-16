'use client';

import { useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { api } from '@pelis/db/api';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { AdminMovieQualityBadges, type AdminMovieListItem } from '../../components/admin-movie-list-item';
import { getAdminMovieDisplayName, isAdminOrphanDisplayName } from '../../lib/movie-display';
import { cn } from '@pelis/ui/utils';

interface NewReleaseMovie extends AdminMovieListItem {
  createdAt?: number;
  _creationTime?: number;
}

const rangeTabs = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
] as const;

export default function AdminNewReleasesPageClient() {
  const searchParams = useSearchParams();
  const [sinceDays, setSinceDays] = useState<number>(30);

  useEffect(() => {
    const param = searchParams.get('days');
    if (param && rangeTabs.some((tab) => tab.value === param)) {
      setSinceDays(Number(param));
    }
  }, [searchParams]);

  const movies = useQuery<any[]>(api.adminMovies.recent, {
    sinceDays,
    limit: 200,
  }) as NewReleaseMovie[] | undefined;

  const createdDate = (movie: NewReleaseMovie): string => {
    const ts = movie.createdAt ?? movie._creationTime;
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <Link
            href="/admin/movies"
            className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Películas
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
            Nuevas películas
          </h1>
          <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
            {movies ? `${movies.length} agregadas en el rango seleccionado` : 'Cargando...'}
          </p>
        </div>
        <Sparkles className="w-8 h-8 text-cinema-gold shrink-0" />
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {rangeTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSinceDays(Number(tab.value))}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors border whitespace-nowrap shrink-0',
                sinceDays === Number(tab.value)
                  ? 'bg-cinema-violet/20 text-white border-cinema-violet/40'
                  : 'text-cinema-muted border-cinema-border hover:text-white hover:border-cinema-silver/30'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {movies === undefined ? (
        <AdminTableSkeleton />
      ) : movies.length === 0 ? (
        <div className="text-center py-24 text-cinema-muted">
          No hay películas nuevas en este rango.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cinema-border bg-cinema-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-cinema-border text-left text-cinema-muted">
                <th className="px-4 py-3 font-medium">Poster</th>
                <th className="px-4 py-3 font-medium">Película</th>
                <th className="px-4 py-3 font-medium">Año</th>
                <th className="px-4 py-3 font-medium">Agregada</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {movies.map((movie) => (
                <tr
                  key={movie._id}
                  className="border-b border-cinema-border/60 hover:bg-cinema-elevated/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/movies/${movie._id}/edit`}>
                      <div className="w-10 h-14 rounded overflow-hidden bg-cinema-elevated">
                        <MoviePoster
                          src={movie.image}
                          alt={getAdminMovieDisplayName(movie)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/movies/${movie._id}/edit`}
                      className={cn(
                        'font-medium max-w-[280px] truncate block hover:text-cinema-violet-light transition-colors',
                        isAdminOrphanDisplayName(movie.name, movie.token)
                          ? 'text-cinema-muted italic'
                          : 'text-white'
                      )}
                    >
                      {getAdminMovieDisplayName(movie)}
                    </Link>
                    <p className="text-xs text-cinema-ash mt-0.5">{movie.genre}</p>
                  </td>
                  <td className="px-4 py-3 text-cinema-muted">{movie.releaseYear}</td>
                  <td className="px-4 py-3 text-cinema-muted">{createdDate(movie)}</td>
                  <td className="px-4 py-3">
                    <AdminMovieQualityBadges quality={movie.quality} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
