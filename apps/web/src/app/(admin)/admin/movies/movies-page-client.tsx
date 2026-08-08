'use client';

import { useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Link2, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { Button, Input, Spinner } from '@pelis/ui/components';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { MergeMovieModal } from '../components/merge-movie-modal';
import { PreviewMovieModal } from '../components/preview-movie-modal';
import { cn } from '@pelis/ui/utils';

type QualityFilter = 'all' | 'orphan_ids' | 'missing_image' | 'missing_video' | 'incomplete';

const filterTabs: { value: QualityFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'orphan_ids', label: 'IDs huérfanos' },
  { value: 'missing_image', label: 'Sin imagen' },
  { value: 'missing_video', label: 'Sin video' },
  { value: 'incomplete', label: 'Incompletas' },
];

interface AdminMovie {
  _id: string;
  name: string;
  image: string;
  token: string;
  genre: string;
  releaseYear: string;
  actors?: string;
  synopsis?: string;
  videoUrl?: string;
  quality: {
    isOrphanId: boolean;
    isMissingImage: boolean;
    isMissingVideo: boolean;
    isIncomplete: boolean;
  };
}

export default function AdminMoviesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [mergeSource, setMergeSource] = useState<AdminMovie | null>(null);
  const [previewMovie, setPreviewMovie] = useState<AdminMovie | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const removeMovie = useMutation(api.movies.remove);

  useEffect(() => {
    const filter = searchParams.get('filter') as QualityFilter | null;
    if (filter && filterTabs.some((tab) => tab.value === filter)) {
      setQualityFilter(filter);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const movies = useQuery(api.adminMovies.adminList, {
    search: debouncedSearch || undefined,
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-white uppercase">Películas</h1>
          <p className="text-cinema-muted mt-2">
            {movies ? `${movies.length} registros` : 'Cargando...'}
          </p>
        </div>
        <Link href="/admin/movies/new">
          <Button>
            <Plus className="w-4 h-4" />
            Nueva película
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => updateFilter(tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm transition-colors border',
              qualityFilter === tab.value
                ? 'bg-cinema-violet/20 text-white border-cinema-violet/40'
                : 'text-cinema-muted border-cinema-border hover:text-white hover:border-cinema-silver/30'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-6 max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o token..."
          iconLeft={<Search className="w-4 h-4" />}
          clearable
          onClear={() => setSearch('')}
        />
      </div>

      {movies === undefined ? (
        <div className="flex items-center justify-center py-24" role="status">
          <Spinner size="lg" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-24 text-cinema-muted">
          No hay películas con estos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cinema-border bg-cinema-surface">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-cinema-border text-left text-cinema-muted">
                <th className="px-4 py-3 font-medium">Poster</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Token</th>
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
                        alt={movie.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white max-w-[220px] truncate">{movie.name}</p>
                    <p className="text-xs text-cinema-ash mt-0.5">{movie.genre}</p>
                  </td>
                  <td className="px-4 py-3 text-cinema-muted font-mono text-xs">{movie.token}</td>
                  <td className="px-4 py-3 text-cinema-muted">{movie.releaseYear}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {movie.quality.isOrphanId && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          ID
                        </span>
                      )}
                      {movie.quality.isMissingImage && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                          Sin img
                        </span>
                      )}
                      {movie.quality.isMissingVideo && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                          Sin video
                        </span>
                      )}
                      {movie.quality.isIncomplete && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cinema-gold/20 text-cinema-gold">
                          Incompleta
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Ver película"
                        onClick={() => setPreviewMovie(movie)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Link href={`/admin/movies/${movie._id}/edit`}>
                        <Button variant="ghost" size="sm" aria-label="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Enlazar"
                        onClick={() => setMergeSource(movie)}
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Eliminar"
                        disabled={deletingId === movie._id}
                        onClick={() => handleDelete(movie._id, movie.name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewMovie && (
        <PreviewMovieModal movie={previewMovie} onClose={() => setPreviewMovie(null)} />
      )}

      {mergeSource && (
        <MergeMovieModal
          source={mergeSource}
          onClose={() => setMergeSource(null)}
          onMerged={() => setMergeSource(null)}
        />
      )}
    </div>
  );
}
