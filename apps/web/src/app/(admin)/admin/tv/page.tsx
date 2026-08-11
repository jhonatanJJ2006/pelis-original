'use client';

import { useAction, useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Radio,
  ToggleLeft,
  ToggleRight,
  ListVideo,
  Download,
  RefreshCw,
  Tv,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { Button, Input, Spinner } from '@pelis/ui/components';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { cn } from '@pelis/ui/utils';

interface TVChannelRow {
  _id: string;
  name: string;
  logo: string;
  category: string;
  country?: string;
  language?: string;
  streamUrl: string;
  source: string;
  isActive: boolean;
  sortOrder?: number;
}

interface TVPlaylistRow {
  _id: string;
  name: string;
  m3uUrl: string;
  country?: string;
  language?: string;
  isActive: boolean;
  lastImportedAt?: number;
  totalChannels?: number;
}

type Mode = 'channels' | 'playlists';

function formatDate(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function AdminTVPage() {
  const [mode, setMode] = useState<Mode>('channels');
  const [search, setSearch] = useState('');

  const channels = useQuery(api.tv.list, {
    search: search || undefined,
  }) as TVChannelRow[] | undefined;
  const playlists = useQuery(api.tv.listPlaylists, {}) as TVPlaylistRow[] | undefined;

  const removeChannel = useMutation(api.tv.removeChannel);
  const toggleChannel = useMutation(api.tv.toggleChannel);
  const removePlaylist = useMutation(api.tv.removePlaylist);
  const importM3U = useAction(api.tv.seedFromM3U);

  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el canal "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingChannelId(id);
    try {
      await removeChannel({ id: id as any });
      toast.success('Canal eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setDeletingChannelId(null);
    }
  };

  const handleToggle = async (ch: TVChannelRow) => {
    try {
      await toggleChannel({ id: ch._id as any, isActive: !ch.isActive });
      toast.success(ch.isActive ? 'Canal desactivado' : 'Canal activado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  const handleDeletePlaylist = async (id: string, name: string) => {
    if (
      !confirm(
        `¿Eliminar la lista "${name}"? Los canales asociados se mantendrán pero perderán la referencia a la lista.`
      )
    )
      return;
    setDeletingPlaylistId(id);
    try {
      await removePlaylist({ id: id as any });
      toast.success('Lista eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleImport = async (pl: TVPlaylistRow) => {
    if (!confirm(`¿Reimportar la lista "${pl.name}"? Se agregarán canales nuevos y se actualizarán los existentes.`))
      return;
    setImportingId(pl._id);
    try {
      const result = await importM3U({
        m3uUrl: pl.m3uUrl,
        playlistId: pl._id as any,
        country: pl.country,
        language: pl.language,
      });
      toast.success(
        `Importados: ${result.added} · Actualizados: ${result.updated} · Fallidos: ${result.failed}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al importar');
    } finally {
      setImportingId(null);
    }
  };

  const tabs: { value: Mode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'channels', label: 'Canales', icon: Tv },
    { value: 'playlists', label: 'Listas M3U', icon: ListVideo },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
            Canales TV
          </h1>
          <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
            {mode === 'channels'
              ? channels
                ? `${channels.length} canales`
                : 'Cargando...'
              : playlists
                ? `${playlists.length} listas M3U`
                : 'Cargando...'}
          </p>
        </div>
        {mode === 'channels' ? (
          <Link href="/admin/tv/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Nuevo canal
            </Button>
          </Link>
        ) : (
          <Link href="/admin/tv/playlists" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Nueva lista M3U
            </Button>
          </Link>
        )}
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setMode(tab.value)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors border whitespace-nowrap shrink-0',
                mode === tab.value
                  ? 'bg-cinema-violet/20 text-white border-cinema-violet/40'
                  : 'text-cinema-muted border-cinema-border hover:text-white hover:border-cinema-silver/30'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'channels' && (
        <>
          <div className="mb-4 sm:mb-6 w-full max-w-md">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              iconLeft={<Search className="w-4 h-4" />}
              clearable
              onClear={() => setSearch('')}
            />
          </div>

          {channels === undefined ? (
            <AdminTableSkeleton />
          ) : channels.length === 0 ? (
            <div className="text-center py-24 text-cinema-muted">
              No hay canales. Importa una lista M3U o crea uno nuevo.
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {channels.map((ch) => (
                  <article key={ch._id} className="rounded-2xl border border-cinema-border bg-cinema-surface p-4">
                    <div className="flex gap-3">
                      <div className="w-14 h-14 shrink-0 rounded-lg bg-cinema-elevated border border-cinema-border flex items-center justify-center overflow-hidden">
                        {ch.logo ? (
                          <img src={ch.logo} alt={ch.name} className="w-10 h-10 object-contain" />
                        ) : (
                          <Radio className="w-6 h-6 text-cinema-silver" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm leading-snug text-white truncate">{ch.name}</h3>
                        <p className="text-xs text-cinema-muted mt-0.5 truncate">
                          {ch.category}
                          {ch.country ? ` · ${ch.country}` : ''}
                        </p>
                        <p className="text-xs text-cinema-ash mt-1 truncate">{ch.source}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-cinema-border/60 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={ch.isActive ? 'Desactivar' : 'Activar'}
                        onClick={() => handleToggle(ch)}
                      >
                        {ch.isActive ? (
                          <ToggleRight className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-cinema-ash" />
                        )}
                      </Button>
                      <Link href={`/admin/tv/${ch._id}/edit`}>
                        <Button variant="ghost" size="sm" aria-label="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Eliminar"
                        disabled={deletingChannelId === ch._id}
                        onClick={() => handleDeleteChannel(ch._id, ch.name)}
                      >
                        {deletingChannelId === ch._id ? (
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
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-cinema-border text-left text-cinema-muted">
                      <th className="px-4 py-3 font-medium">Canal</th>
                      <th className="px-4 py-3 font-medium">Categoría</th>
                      <th className="px-4 py-3 font-medium">País</th>
                      <th className="px-4 py-3 font-medium">Idioma</th>
                      <th className="px-4 py-3 font-medium">Fuente</th>
                      <th className="px-4 py-3 font-medium">Activo</th>
                      <th className="px-4 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((ch) => (
                      <tr key={ch._id} className="border-b border-cinema-border/60 hover:bg-cinema-elevated/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-lg bg-cinema-elevated border border-cinema-border flex items-center justify-center overflow-hidden">
                              {ch.logo ? (
                                <img src={ch.logo} alt={ch.name} className="w-8 h-8 object-contain" />
                              ) : (
                                <Radio className="w-5 h-5 text-cinema-silver" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate max-w-[240px]">{ch.name}</p>
                              <p className="text-[10px] text-cinema-ash truncate max-w-[240px]">{ch.streamUrl}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-cinema-muted">{ch.category}</td>
                        <td className="px-4 py-3 text-cinema-muted">{ch.country ?? '—'}</td>
                        <td className="px-4 py-3 text-cinema-muted">{ch.language ?? '—'}</td>
                        <td className="px-4 py-3 text-cinema-muted text-[10px]">{ch.source}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center text-[10px] px-2 py-0.5 rounded-full',
                              ch.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cinema-elevated text-cinema-muted'
                            )}
                          >
                            {ch.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" aria-label={ch.isActive ? 'Desactivar' : 'Activar'} onClick={() => handleToggle(ch)}>
                              {ch.isActive ? (
                                <ToggleRight className="w-4 h-4 text-emerald-300" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-cinema-ash" />
                              )}
                            </Button>
                            <Link href={`/admin/tv/${ch._id}/edit`}>
                              <Button variant="ghost" size="sm" aria-label="Editar">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Eliminar"
                              disabled={deletingChannelId === ch._id}
                              onClick={() => handleDeleteChannel(ch._id, ch.name)}
                            >
                              {deletingChannelId === ch._id ? (
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
        </>
      )}

      {mode === 'playlists' && (
        <>
          {playlists === undefined ? (
            <AdminTableSkeleton />
          ) : playlists.length === 0 ? (
            <div className="text-center py-24 text-cinema-muted">
              No hay listas M3U. Crea una para empezar a importar canales.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {playlists.map((pl) => (
                <article key={pl._id} className="rounded-2xl border border-cinema-border bg-cinema-surface p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cinema-violet/15 text-cinema-violet-light">
                        <ListVideo className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg uppercase tracking-wide text-white">{pl.name}</h3>
                        <p className="text-xs text-cinema-muted mt-0.5">
                          {pl.country ?? 'Sin país'} · {pl.language ?? 'es'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold',
                        pl.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cinema-elevated text-cinema-muted'
                      )}
                    >
                      {pl.isActive ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="text-xs text-cinema-ash break-all bg-cinema-elevated/40 rounded-lg p-2 line-clamp-2">
                    {pl.m3uUrl}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-cinema-elevated/40 p-2">
                      <p className="text-cinema-ash text-[10px] uppercase tracking-wider">Canales</p>
                      <p className="text-white font-medium text-base mt-0.5">{pl.totalChannels ?? '—'}</p>
                    </div>
                    <div className="rounded-lg bg-cinema-elevated/40 p-2">
                      <p className="text-cinema-ash text-[10px] uppercase tracking-wider">Última importación</p>
                      <p className="text-white font-medium mt-0.5">{formatDate(pl.lastImportedAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-cinema-border/60">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleImport(pl)}
                      disabled={importingId === pl._id}
                    >
                      {importingId === pl._id ? (
                        <>
                          <Spinner className="w-4 h-4" />
                          Importando...
                        </>
                      ) : (
                        <>
                          {pl.lastImportedAt ? <RefreshCw className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          {pl.lastImportedAt ? 'Reimportar' : 'Importar ahora'}
                        </>
                      )}
                    </Button>
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Eliminar"
                        disabled={deletingPlaylistId === pl._id}
                        onClick={() => handleDeletePlaylist(pl._id, pl.name)}
                      >
                        {deletingPlaylistId === pl._id ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}