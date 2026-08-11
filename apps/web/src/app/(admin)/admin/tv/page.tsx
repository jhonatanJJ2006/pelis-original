'use client';

import { useAction, useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { useMemo, useState, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { Button, Input, Spinner } from '@pelis/ui/components';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { cn } from '@pelis/ui/utils';
import { VerifyChannelsModal } from './verify-channels-modal';

type StreamStatus = 'unknown' | 'online' | 'offline';
type StatusFilter = 'all' | StreamStatus | 'inactive';

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
  streamStatus?: StreamStatus;
  lastCheckedAt?: number;
  lastStreamError?: string;
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

function StreamStatusBadge({ status }: { status?: StreamStatus }) {
  const resolved = status ?? 'unknown';
  const config = {
    online: { label: 'Online', className: 'bg-emerald-500/20 text-emerald-300' },
    offline: { label: 'Caído', className: 'bg-red-500/20 text-red-300' },
    unknown: { label: 'Sin verificar', className: 'bg-cinema-elevated text-cinema-muted' },
  }[resolved];

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Caídos' },
  { value: 'unknown', label: 'Sin verificar' },
  { value: 'inactive', label: 'Inactivos' },
];

const PAGE_SIZE = 15;

export default function AdminTVPage() {
  const [mode, setMode] = useState<Mode>('channels');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);

  const listArgs = useMemo(() => {
    const args: {
      search?: string;
      streamStatus?: StreamStatus;
      isActive?: boolean;
    } = {};
    if (search.trim()) args.search = search.trim();
    if (statusFilter === 'online' || statusFilter === 'offline' || statusFilter === 'unknown') {
      args.streamStatus = statusFilter;
    }
    if (statusFilter === 'inactive') args.isActive = false;
    return args;
  }, [search, statusFilter]);

  const channels = useQuery(api.tv.listAdmin, listArgs) as TVChannelRow[] | undefined;
  const playlists = useQuery(api.tv.listPlaylists, {}) as TVPlaylistRow[] | undefined;

  const removeChannel = useMutation(api.tv.removeChannel);
  const toggleChannel = useMutation(api.tv.toggleChannel);
  const removePlaylist = useMutation(api.tv.removePlaylist);
  const importM3U = useAction(api.tv.seedFromM3U);
  const checkChannel = useAction(api.tvHealth.checkChannelStream);

  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingPage, setCheckingPage] = useState(false);
  const [checkProgress, setCheckProgress] = useState<{ done: number; total: number } | null>(null);
  const [verifyAllOpen, setVerifyAllOpen] = useState(false);

  const totalChannels = channels?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalChannels / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const paginatedChannels = useMemo(() => {
    if (!channels) return [];
    const start = safePage * PAGE_SIZE;
    return channels.slice(start, start + PAGE_SIZE);
  }, [channels, safePage]);

  const pageStart = totalChannels === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const pageEnd = Math.min((safePage + 1) * PAGE_SIZE, totalChannels);

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

  const handleCheckChannel = async (ch: TVChannelRow) => {
    setCheckingId(ch._id);
    try {
      const result = await checkChannel({ channelId: ch._id as any });
      if (result.streamStatus === 'online') {
        toast.success(`${ch.name}: stream online`);
      } else {
        toast.error(`${ch.name}: ${result.lastStreamError ?? 'stream caído'}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al verificar');
    } finally {
      setCheckingId(null);
    }
  };

  const handleCheckPage = async () => {
    if (paginatedChannels.length === 0) return;

    setCheckingPage(true);
    setCheckProgress({ done: 0, total: paginatedChannels.length });

    let online = 0;
    let offline = 0;

    try {
      for (let i = 0; i < paginatedChannels.length; i++) {
        const ch = paginatedChannels[i];
        setCheckingId(ch._id);
        setCheckProgress({ done: i, total: paginatedChannels.length });

        try {
          const result = await checkChannel({ channelId: ch._id as any });
          if (result.streamStatus === 'online') online += 1;
          else offline += 1;
        } catch {
          offline += 1;
        }
      }

      setCheckProgress({ done: paginatedChannels.length, total: paginatedChannels.length });
      toast.success(
        `Página ${safePage + 1}: ${online} online · ${offline} caídos · ${paginatedChannels.length} verificados`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al verificar');
    } finally {
      setCheckingId(null);
      setCheckingPage(false);
      setCheckProgress(null);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleVerifyAllComplete = useCallback(
    (stats: { online: number; offline: number; total: number; cancelled: boolean }) => {
      if (stats.cancelled) {
        toast.info(
          `Cancelado: ${stats.online} online · ${stats.offline} caídos · ${stats.total} verificados`
        );
      } else {
        toast.success(
          `Verificación completa: ${stats.online} online · ${stats.offline} caídos · ${stats.total} total`
        );
      }
    },
    []
  );

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
    <>
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
            Canales TV
          </h1>
          <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
            {mode === 'channels'
              ? channels
                ? totalChannels === 0
                  ? '0 canales'
                  : `${totalChannels} canales · mostrando ${pageStart}–${pageEnd}`
                : 'Cargando...'
              : playlists
                ? `${playlists.length} listas M3U`
                : 'Cargando...'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {mode === 'channels' && (
            <>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setVerifyAllOpen(true)}
                disabled={checkingPage || verifyAllOpen || totalChannels === 0}
              >
                <Activity className="w-4 h-4" />
                Verificar todos
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={handleCheckPage}
                disabled={checkingPage || verifyAllOpen || paginatedChannels.length === 0}
              >
                {checkingPage ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    {checkProgress
                      ? `Verificando ${checkProgress.done + 1}/${checkProgress.total}...`
                      : 'Verificando...'}
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Verificar página ({PAGE_SIZE})
                  </>
                )}
              </Button>
            </>
          )}
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
          <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full max-w-md">
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar por nombre..."
                iconLeft={<Search className="w-4 h-4" />}
                clearable
                onClear={() => handleSearchChange('')}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(filter.value)}
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 rounded-full text-xs transition-colors border whitespace-nowrap shrink-0',
                    statusFilter === filter.value
                      ? 'bg-cinema-violet/20 text-white border-cinema-violet/40'
                      : 'text-cinema-muted border-cinema-border hover:text-white hover:border-cinema-silver/30'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {channels === undefined ? (
            <AdminTableSkeleton />
          ) : channels.length === 0 ? (
            <div className="text-center py-24 text-cinema-muted">
              No hay canales con estos filtros. Importa una lista M3U o crea uno nuevo.
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {paginatedChannels.map((ch) => (
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
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-sm leading-snug text-white truncate">{ch.name}</h3>
                          <StreamStatusBadge status={ch.streamStatus} />
                          {!ch.isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cinema-elevated text-cinema-muted">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-cinema-muted mt-0.5 truncate">
                          {ch.category}
                          {ch.country ? ` · ${ch.country}` : ''}
                        </p>
                        {ch.lastStreamError && (
                          <p className="text-[10px] text-red-300/80 mt-1 line-clamp-2">{ch.lastStreamError}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-cinema-border/60 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Probar stream"
                        disabled={checkingId === ch._id}
                        onClick={() => handleCheckChannel(ch)}
                      >
                        {checkingId === ch._id ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                      </Button>
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
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-cinema-border text-left text-cinema-muted">
                      <th className="px-4 py-3 font-medium">Canal</th>
                      <th className="px-4 py-3 font-medium">Stream</th>
                      <th className="px-4 py-3 font-medium">Categoría</th>
                      <th className="px-4 py-3 font-medium">Activo</th>
                      <th className="px-4 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedChannels.map((ch) => (
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
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <StreamStatusBadge status={ch.streamStatus} />
                            <p className="text-[10px] text-cinema-ash">{formatDate(ch.lastCheckedAt)}</p>
                            {ch.lastStreamError && (
                              <p className="text-[10px] text-red-300/80 max-w-[220px] truncate" title={ch.lastStreamError}>
                                {ch.lastStreamError}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-cinema-muted">{ch.category}</td>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Probar stream"
                              disabled={checkingId === ch._id}
                              onClick={() => handleCheckChannel(ch)}
                            >
                              {checkingId === ch._id ? (
                                <Spinner className="w-4 h-4" />
                              ) : (
                                <Activity className="w-4 h-4" />
                              )}
                            </Button>
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

              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-cinema-muted">
                    Página {safePage + 1} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={safePage === 0 || checkingPage}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={safePage >= totalPages - 1 || checkingPage}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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

    {verifyAllOpen && channels && channels.length > 0 && (
      <VerifyChannelsModal
        channels={channels.map((ch) => ({ _id: ch._id, name: ch.name }))}
        checkChannel={(args) => checkChannel({ channelId: args.channelId as any })}
        onClose={() => setVerifyAllOpen(false)}
        onComplete={handleVerifyAllComplete}
      />
    )}
    </>
  );
}
