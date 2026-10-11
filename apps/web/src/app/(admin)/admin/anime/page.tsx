'use client';

import { useQuery, useMutation, useAction } from '@pelis/db/client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Download,
  ImageIcon,
  Monitor,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { Button, Input, Spinner } from '@pelis/ui/components';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { MoviePoster } from '@pelis/ui/features/movie-poster';
import { cn } from '@pelis/ui/utils';
import { EnrichAnimeModal } from '../components/enrich-anime-modal';
import { BackdropAnimeModal } from '../components/backdrop-anime-modal';
import { ProviderHealthPanel } from '../components/provider-health-panel';
import { AnilistSearchModal } from '../components/anilist-search-modal';

interface AnimeRow {
  _id: string;
  title: string;
  alternativeTitle?: string;
  image: string;
  backdropImage?: string;
  episodes: number;
  status: 'ongoing' | 'completed';
  year: number;
  rating?: number;
  genre: string[];
  isMissingBackdrop?: boolean;
  isMissingImage?: boolean;
}

export default function AdminAnimePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'ongoing' | 'completed'>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enrichTarget, setEnrichTarget] = useState<AnimeRow | null>(null);
  const [backdropTarget, setBackdropTarget] = useState<AnimeRow | null>(null);
  const [showAnilistSearch, setShowAnilistSearch] = useState(false);
  const [importingCatalog, setImportingCatalog] = useState(false);

  const anime = useQuery(api.adminAnime.adminList, {
    search: search || undefined,
    status: statusFilter || undefined,
    limit: 500,
  }) as AnimeRow[] | undefined;

  const remove = useMutation(api.adminAnime.remove);
  const importCatalog = useAction(api.anime.importCatalogBulk);

  const handleImportCatalog = async () => {
    if (!confirm('¿Importar ~200 animes populares desde AniList? Puede tardar varios minutos.'))
      return;
    setImportingCatalog(true);
    try {
      const result = (await importCatalog({ limit: 200 })) as {
        imported: number;
        skipped: number;
        total: number;
      };
      toast.success(`Importados: ${result.imported}, omitidos: ${result.skipped}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al importar catálogo');
    } finally {
      setImportingCatalog(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await remove({ id: id as any });
      toast.success('Anime eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const tabs: { value: '' | 'ongoing' | 'completed'; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'ongoing', label: 'En emisión' },
    { value: 'completed', label: 'Finalizados' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-cinema-chalk">
            Anime
          </h1>
          <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
            {anime ? `${anime.length} títulos` : 'Cargando...'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="ghost" onClick={() => setShowAnilistSearch(true)}>
            <Search className="w-4 h-4" />
            AniList
          </Button>
          <Button variant="ghost" onClick={handleImportCatalog} disabled={importingCatalog}>
            {importingCatalog ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            Importar catálogo
          </Button>
          <Link href="/admin/anime/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Nuevo anime
            </Button>
          </Link>
        </div>
      </div>

      <ProviderHealthPanel />

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors border whitespace-nowrap shrink-0',
                statusFilter === tab.value
                  ? 'bg-cinema-violet/20 text-white border-cinema-violet/40'
                  : 'text-cinema-muted border-cinema-border hover:text-white hover:border-cinema-silver/30'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 sm:mb-6 w-full max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título..."
          iconLeft={<Search className="w-4 h-4" />}
          clearable
          onClear={() => setSearch('')}
        />
      </div>

      {anime === undefined ? (
        <AdminTableSkeleton />
      ) : anime.length === 0 ? (
        <div className="text-center py-24 text-cinema-muted">No hay animes con ese filtro.</div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {anime.map((a) => (
              <article
                key={a._id}
                className="rounded-2xl border border-cinema-border bg-cinema-surface p-4"
              >
                <div className="flex gap-3">
                  <div className="w-14 h-20 shrink-0 rounded-lg overflow-hidden bg-cinema-elevated">
                    <MoviePoster
                      src={a.image}
                      alt={a.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm leading-snug text-white">{a.title}</h3>
                    {a.alternativeTitle && (
                      <p className="text-xs text-cinema-ash mt-0.5 truncate">
                        {a.alternativeTitle}
                      </p>
                    )}
                    <p className="text-xs text-cinema-muted mt-1">
                      {a.year} · {a.episodes} ep. ·{' '}
                      {a.status === 'ongoing' ? 'En emisión' : 'Finalizado'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-cinema-border/60 flex flex-wrap justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Poster TMDB"
                    onClick={() => setEnrichTarget(a)}
                  >
                    <ImageIcon className="w-4 h-4 text-cinema-violet-light" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Backdrop TMDB"
                    onClick={() => setBackdropTarget(a)}
                  >
                    <Monitor className="w-4 h-4 text-cyan-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Completar desde TMDB"
                    onClick={() => setEnrichTarget(a)}
                  >
                    <Sparkles className="w-4 h-4 text-cinema-gold" />
                  </Button>
                  <Link href={`/admin/anime/${a._id}/edit`}>
                    <Button variant="ghost" size="sm" aria-label="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Eliminar"
                    disabled={deletingId === a._id}
                    onClick={() => handleDelete(a._id, a.title)}
                  >
                    {deletingId === a._id ? (
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
            <table className="admin-table w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-cinema-border text-left text-cinema-muted">
                  <th className="px-4 py-3 font-medium">Poster</th>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Año</th>
                  <th className="px-4 py-3 font-medium">Episodios</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {anime.map((a) => (
                  <tr
                    key={a._id}
                    className="border-b border-cinema-border/60 hover:bg-cinema-elevated/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-10 h-14 rounded overflow-hidden bg-cinema-elevated">
                        <MoviePoster
                          src={a.image}
                          alt={a.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium max-w-[260px] truncate text-white">{a.title}</p>
                      <p className="text-xs text-cinema-ash mt-0.5 truncate">
                        {a.genre.slice(0, 3).join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-cinema-muted">{a.year}</td>
                    <td className="px-4 py-3 text-cinema-muted">{a.episodes}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center text-[10px] px-2 py-0.5 rounded-full',
                          a.status === 'ongoing'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-cinema-violet/20 text-cinema-violet-light'
                        )}
                      >
                        {a.status === 'ongoing' ? 'En emisión' : 'Finalizado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cinema-muted">
                      {a.rating ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-cinema-gold fill-cinema-gold" />
                          {a.rating.toFixed(1)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Poster TMDB"
                          onClick={() => setEnrichTarget(a)}
                        >
                          <ImageIcon className="w-4 h-4 text-cinema-violet-light" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Backdrop TMDB"
                          onClick={() => setBackdropTarget(a)}
                        >
                          <Monitor className="w-4 h-4 text-cyan-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Completar desde TMDB"
                          onClick={() => setEnrichTarget(a)}
                        >
                          <Sparkles className="w-4 h-4 text-cinema-gold" />
                        </Button>
                        <Link href={`/admin/anime/${a._id}/edit`}>
                          <Button variant="ghost" size="sm" aria-label="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Eliminar"
                          disabled={deletingId === a._id}
                          onClick={() => handleDelete(a._id, a.title)}
                        >
                          {deletingId === a._id ? (
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

      {enrichTarget && (
        <EnrichAnimeModal
          anime={enrichTarget}
          onClose={() => setEnrichTarget(null)}
          onEnriched={() => setEnrichTarget(null)}
        />
      )}

      {backdropTarget && (
        <BackdropAnimeModal
          anime={backdropTarget}
          onClose={() => setBackdropTarget(null)}
          onApplied={() => setBackdropTarget(null)}
        />
      )}

      {showAnilistSearch && (
        <AnilistSearchModal
          onClose={() => setShowAnilistSearch(false)}
          onImported={() => setShowAnilistSearch(false)}
        />
      )}
    </div>
  );
}
