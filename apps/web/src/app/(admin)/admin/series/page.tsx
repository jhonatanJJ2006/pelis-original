'use client';

import { useQuery, useMutation } from 'convex/react';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Tv, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { Button, Input, Spinner } from '@pelis/ui/components';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { cn } from '@pelis/ui/utils';

interface SeriesRow {
  _id: string;
  name: string;
  image: string;
  genre: string;
  classification: string;
  releaseYear: string;
  episodes?: number;
  season?: number;
  featured?: boolean;
  isOrphanId: boolean;
}

export default function AdminSeriesPage() {
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const series = useQuery(api.adminSeries.adminList, {
    search: search || undefined,
    limit: 500,
  }) as SeriesRow[] | undefined;
  const remove = useMutation(api.adminSeries.remove);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await remove({ id: id as any });
      toast.success('Serie eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
            Series
          </h1>
          <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
            {series ? `${series.length} series` : 'Cargando...'}
          </p>
        </div>
        <Link href="/admin/series/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nueva serie
          </Button>
        </Link>
      </div>

      <div className="mb-4 sm:mb-6 w-full max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, género o actores..."
          iconLeft={<Search className="w-4 h-4" />}
          clearable
          onClear={() => setSearch('')}
        />
      </div>

      {series === undefined ? (
        <AdminTableSkeleton />
      ) : series.length === 0 ? (
        <div className="text-center py-24 text-cinema-muted">
          No hay series con ese filtro.
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {series.map((s) => (
              <article
                key={s._id}
                className="rounded-2xl border border-cinema-border bg-cinema-surface p-4"
              >
                <div className="flex gap-3">
                  <div className="w-14 h-20 shrink-0 rounded-lg overflow-hidden bg-cinema-elevated">
                    <MoviePoster src={s.image} alt={s.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={cn('font-medium text-sm leading-snug', s.isOrphanId ? 'text-cinema-muted italic' : 'text-white')}>
                      {s.isOrphanId ? 'Sin título' : s.name}
                    </h3>
                    <p className="text-xs text-cinema-ash mt-1 truncate">{s.genre}</p>
                    <p className="text-xs text-cinema-muted mt-1">
                      {s.releaseYear} · {s.classification}
                      {s.episodes ? ` · ${s.episodes} ep.` : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-cinema-border/60 flex justify-end gap-1">
                  <Link href={`/admin/series/${s._id}/edit`}>
                    <Button variant="ghost" size="sm" aria-label="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Eliminar"
                    disabled={deletingId === s._id}
                    onClick={() => handleDelete(s._id, s.isOrphanId ? 'esta serie' : s.name)}
                  >
                    {deletingId === s._id ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-400" />
                    )}
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-2xl border border-cinema-border bg-cinema-surface">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-cinema-border text-left text-cinema-muted">
                  <th className="px-4 py-3 font-medium">Poster</th>
                  <th className="px-4 py-3 font-medium">Serie</th>
                  <th className="px-4 py-3 font-medium">Año</th>
                  <th className="px-4 py-3 font-medium">Clasif.</th>
                  <th className="px-4 py-3 font-medium">Episodios</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s._id} className="border-b border-cinema-border/60 hover:bg-cinema-elevated/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-10 h-14 rounded overflow-hidden bg-cinema-elevated">
                        <MoviePoster src={s.image} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={cn('font-medium max-w-[280px] truncate', s.isOrphanId ? 'text-cinema-muted italic' : 'text-white')}>
                        {s.isOrphanId ? 'Sin título' : s.name}
                      </p>
                      <p className="text-xs text-cinema-ash mt-0.5">{s.genre}</p>
                    </td>
                    <td className="px-4 py-3 text-cinema-muted">{s.releaseYear}</td>
                    <td className="px-4 py-3 text-cinema-muted">{s.classification}</td>
                    <td className="px-4 py-3 text-cinema-muted">{s.episodes ?? '—'}</td>
                    <td className="px-4 py-3">
                      {s.isOrphanId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          <AlertTriangle className="w-3 h-3" /> ID
                        </span>
                      ) : s.featured ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cinema-gold/20 text-cinema-gold">
                          <Sparkles className="w-3 h-3" /> Destacada
                        </span>
                      ) : (
                        <span className="text-xs text-cinema-ash">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/series/${s._id}/edit`}>
                          <Button variant="ghost" size="sm" aria-label="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Eliminar"
                          disabled={deletingId === s._id}
                          onClick={() => handleDelete(s._id, s.isOrphanId ? 'esta serie' : s.name)}
                        >
                          {deletingId === s._id ? (
                            <Spinner className="w-4 h-4" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-400" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}