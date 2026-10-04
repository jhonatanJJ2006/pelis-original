'use client';

import { useAction, useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Search, Sparkles, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { Button, Input, Select, Spinner } from '@pelis/ui/components';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { EnrichMovieModal } from '../components/enrich-movie-modal';
import { PosterPickerModal } from '../components/poster-picker-modal';
import { BackdropPickerModal } from '../components/backdrop-picker-modal';
import { MergeMovieModal } from '../components/merge-movie-modal';
import { PreviewMovieModal } from '../components/preview-movie-modal';
import {
  AdminMovieActions,
  AdminMovieMobileCard,
  AdminMovieQualityBadges,
  type AdminMovieListItem,
} from '../components/admin-movie-list-item';
import { getAdminMovieDisplayName, isAdminOrphanDisplayName } from '../lib/movie-display';
import { cn } from '@pelis/ui/utils';

type QualityFilter =
  | 'all'
  | 'orphan_ids'
  | 'missing_image'
  | 'missing_image_titled'
  | 'missing_video'
  | 'incomplete'
  | 'missing_backdrop';

const filterTabs: { value: QualityFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'missing_video', label: 'Sin video' },
  { value: 'orphan_ids', label: 'IDs huérfanos' },
  { value: 'missing_image', label: 'Sin imagen' },
  { value: 'missing_image_titled', label: 'Sin poster (con título)' },
  { value: 'missing_backdrop', label: 'Sin backdrop' },
  { value: 'incomplete', label: 'Incompletas' },
];

interface AdminMovie extends AdminMovieListItem {
  actors: string;
  synopsis: string;
  videoUrl?: string;
  classification: string;
}

export default function AdminMoviesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [genre, setGenre] = useState('');
  const [mergeSource, setMergeSource] = useState<AdminMovie | null>(null);
  const [previewMovie, setPreviewMovie] = useState<AdminMovie | null>(null);
  const [enrichTarget, setEnrichTarget] = useState<AdminMovie | null>(null);
  const [posterTarget, setPosterTarget] = useState<AdminMovie | null>(null);
  const [backdropTarget, setBackdropTarget] = useState<AdminMovie | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkBackdrops, setBulkBackdrops] = useState(false);

  const removeMovie = useMutation(api.movies.remove);
  const enrichMoviesBulk = useAction<{ movieIds: string[] }, any>(
    api.adminEnrichment.enrichMoviesBulk
  );
  const applyBackdropsBulk = useAction<{ movieIds: string[] }, any>(
    api.adminEnrichment.applyBackdropsBulk
  );

  useEffect(() => {
    const filter = searchParams.get('filter') as QualityFilter | null;
    if (filter && filterTabs.some((tab) => tab.value === filter)) {
      setQualityFilter(filter);
    }
    setGenre(searchParams.get('genre') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const genres = (useQuery(api.movies.getGenres) as string[] | undefined) ?? [];

  const movies = useQuery(api.adminMovies.adminList, {
    search: debouncedSearch || undefined,
    genre: genre || undefined,
    qualityFilter,
    limit: 300,
  }) as AdminMovie[] | undefined;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;

    setDeletingId(id);
    try {
      await removeMovie({ id: id as any });
      toast.success('Película eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const updateFilter = (filter: QualityFilter) => {
    setQualityFilter(filter);
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    router.replace(`/admin/movies?${params.toString()}`);
  };

  const updateGenre = (next: string) => {
    setGenre(next);
    const params = new URLSearchParams(searchParams.toString());
    if (!next) params.delete('genre');
    else params.set('genre', next);
    const qs = params.toString();
    router.replace(qs ? `/admin/movies?${qs}` : '/admin/movies');
  };

  const canEnrich = (movie: AdminMovie) =>
    !movie.quality.isOrphanId && (movie.quality.isIncomplete || movie.quality.isMissingImage);

  const canPickPoster = (movie: AdminMovie) => !movie.quality.isOrphanId;
  const canPickBackdrop = (movie: AdminMovie) => !movie.quality.isOrphanId;

  const renderMovieActions = (movie: AdminMovie) => (
    <AdminMovieActions
      movie={movie}
      deletingId={deletingId}
      canEnrich={canEnrich(movie)}
      canPickPoster={canPickPoster(movie)}
      canPickBackdrop={canPickBackdrop(movie)}
      onPreview={() => setPreviewMovie(movie)}
      onPoster={() => setPosterTarget(movie)}
      onBackdrop={() => setBackdropTarget(movie)}
      onEnrich={() => setEnrichTarget(movie)}
      onMerge={() => setMergeSource(movie)}
      onDelete={() => handleDelete(movie._id, getAdminMovieDisplayName(movie))}
    />
  );

  const handleBulkBackdrops = async () => {
    if (!movies?.length) return;

    const eligible = movies.filter((m) => !m.quality.isOrphanId && m.quality.isMissingBackdrop);
    if (eligible.length === 0) {
      toast.info('No hay películas sin backdrop en esta vista');
      return;
    }

    if (
      !confirm(
        `¿Descargar backdrop de TMDB para ${eligible.length} película(s)? Solo se aplicará a las que aún no tienen imagen ancha.`
      )
    ) {
      return;
    }

    setBulkBackdrops(true);
    try {
      const result = await applyBackdropsBulk({
        movieIds: eligible.map((m) => m._id as any),
      });
      toast.success(
        `Listo: ${result.ok} actualizadas, ${result.failed} fallidas, ${result.skipped} omitidas`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en backdrops masivos');
    } finally {
      setBulkBackdrops(false);
    }
  };

  const handleBulkEnrich = async () => {
    if (!movies?.length) return;

    const eligible = movies.filter(canEnrich);
    if (eligible.length === 0) {
      toast.info('No hay películas elegibles para enriquecer en esta vista');
      return;
    }

    if (
      !confirm(
        `¿Completar metadata de ${eligible.length} película(s) desde TMDB? Se usará el primer resultado de búsqueda para cada una.`
      )
    ) {
      return;
    }

    setBulkEnriching(true);
    try {
      const result = await enrichMoviesBulk({
        movieIds: eligible.map((m) => m._id as any),
      });
      toast.success(
        `Listo: ${result.ok} actualizadas, ${result.failed} fallidas, ${result.skipped} omitidas`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en enriquecimiento masivo');
    } finally {
      setBulkEnriching(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
            Películas
          </h1>
          <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
            {movies ? `${movies.length} registros` : 'Cargando...'}
          </p>
        </div>
        <Link href="/admin/movies/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nueva película
          </Button>
        </Link>
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => updateFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors border whitespace-nowrap shrink-0',
                qualityFilter === tab.value
                  ? 'bg-cinema-violet/20 text-white border-cinema-violet/40'
                  : 'text-cinema-muted border-cinema-border hover:text-white hover:border-cinema-silver/30'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mb-4 sm:mb-6">
        {qualityFilter === 'incomplete' && movies && movies.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto sm:ml-auto"
            disabled={bulkEnriching}
            onClick={handleBulkEnrich}
          >
            {bulkEnriching ? (
              <>
                <Spinner className="w-4 h-4" />
                Completando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Completar incompletas
              </>
            )}
          </Button>
        )}
        {(qualityFilter === 'all' || qualityFilter === 'missing_backdrop') &&
          movies &&
          movies.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto sm:ml-auto"
              disabled={bulkBackdrops}
              onClick={handleBulkBackdrops}
            >
              {bulkBackdrops ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Aplicando backdrops...
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4" />
                  Aplicar backdrops (TMDB)
                </>
              )}
            </Button>
          )}
      </div>

      <div className="mb-4 sm:mb-6 flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
        <div className="w-full max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, actor o token..."
            iconLeft={<Search className="w-4 h-4" />}
            clearable
            onClear={() => setSearch('')}
          />
        </div>
        <Select
          aria-label="Filtrar por género"
          value={genre}
          onChange={(e) => updateGenre(e.target.value)}
          wrapperClassName="w-full sm:w-56"
        >
          <option value="">Todos los géneros</option>
          {genres.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {movies === undefined ? (
        <AdminTableSkeleton />
      ) : movies.length === 0 ? (
        <div className="text-center py-24 text-cinema-muted">
          No hay películas con estos filtros.
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {movies.map((movie) => (
              <AdminMovieMobileCard
                key={movie._id}
                movie={movie}
                deletingId={deletingId}
                canEnrich={canEnrich(movie)}
                canPickPoster={canPickPoster(movie)}
                canPickBackdrop={canPickBackdrop(movie)}
                onOpen={() => setPreviewMovie(movie)}
                onPreview={() => setPreviewMovie(movie)}
                onPoster={() => setPosterTarget(movie)}
                onBackdrop={() => setBackdropTarget(movie)}
                onEnrich={() => setEnrichTarget(movie)}
                onMerge={() => setMergeSource(movie)}
                onDelete={() => handleDelete(movie._id, getAdminMovieDisplayName(movie))}
              />
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-2xl border border-cinema-border bg-cinema-surface">
            <table className="w-full min-w-[720px] lg:min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-cinema-border text-left text-cinema-muted">
                  <th className="px-4 py-3 font-medium">Poster</th>
                  <th className="px-4 py-3 font-medium">Película</th>
                  <th className="px-4 py-3 font-medium">Año</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movies.map((movie) => (
                  <tr
                    key={movie._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewMovie(movie)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPreviewMovie(movie);
                      }
                    }}
                    className="border-b border-cinema-border/60 hover:bg-cinema-elevated/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="w-10 h-14 rounded overflow-hidden bg-cinema-elevated">
                        <MoviePoster
                          src={movie.image}
                          alt={getAdminMovieDisplayName(movie)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p
                        className={cn(
                          'font-medium max-w-[280px] truncate',
                          isAdminOrphanDisplayName(movie.name, movie.token)
                            ? 'text-cinema-muted italic'
                            : 'text-white'
                        )}
                      >
                        {getAdminMovieDisplayName(movie)}
                      </p>
                      <p className="text-xs text-cinema-ash mt-0.5">{movie.genre}</p>
                    </td>
                    <td className="px-4 py-3 text-cinema-muted">{movie.releaseYear}</td>
                    <td className="px-4 py-3">
                      <AdminMovieQualityBadges quality={movie.quality} />
                    </td>
                    <td className="px-4 py-3">{renderMovieActions(movie)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {previewMovie && (
        <PreviewMovieModal
          movie={previewMovie}
          onClose={() => setPreviewMovie(null)}
          onBackdrop={
            previewMovie.quality.isOrphanId ? undefined : () => setBackdropTarget(previewMovie)
          }
        />
      )}

      {mergeSource && (
        <MergeMovieModal
          source={mergeSource}
          onClose={() => setMergeSource(null)}
          onMerged={() => setMergeSource(null)}
        />
      )}

      {enrichTarget && (
        <EnrichMovieModal
          movie={enrichTarget}
          onClose={() => setEnrichTarget(null)}
          onEnriched={() => setEnrichTarget(null)}
        />
      )}

      {posterTarget && (
        <PosterPickerModal
          movie={posterTarget}
          onClose={() => setPosterTarget(null)}
          onApplied={() => setPosterTarget(null)}
        />
      )}

      {backdropTarget && (
        <BackdropPickerModal
          movie={backdropTarget}
          onClose={() => setBackdropTarget(null)}
          onApplied={() => setBackdropTarget(null)}
        />
      )}
    </div>
  );
}
