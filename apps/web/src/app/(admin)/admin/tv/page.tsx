'use client';

import { useAction, useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  Activity,
  Star,
  Zap,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
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
  isPopular?: boolean;
  streamStatus?: 'online' | 'offline' | 'unknown';
  lastCheckedAt?: number;
  lastStreamError?: string;
  consecutiveFailures?: number;
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

type Mode = 'channels' | 'playlists' | 'popular';

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
  const [statusFilter, setStatusFilter] = useState<'' | 'online' | 'offline' | 'unknown'>('');
  const [offset, setOffset] = useState(0);
  const [acc, setAcc] = useState<TVChannelRow[]>([]);

  const channels = useQuery(api.tv.adminList, {
    search: search || undefined,
    streamStatus: (statusFilter || undefined) as 'online' | 'offline' | 'unknown' | undefined,
    popularOnly: mode === 'popular' || undefined,
    includeInactive: true,
    limit: 48,
    offset,
  }) as
    | { items: TVChannelRow[]; total: number; hasMore: boolean; offset: number; limit: number }
    | undefined;
  const playlists = useQuery(api.tv.listPlaylists, {}) as TVPlaylistRow[] | undefined;
  const stats = useQuery(api.tv.getStats, {}) as
    | {
        total: number;
        active: number;
        popular: number;
        online: number;
        offline: number;
        unknown: number;
        geoBlocked: number;
      }
    | undefined;

  const removeChannel = useMutation<{ id: string }, string>(api.tv.removeChannel);
  const toggleChannel = useMutation<{ id: string; isActive: boolean }, string>(
    api.tv.toggleChannel
  );
  const togglePopular = useMutation<{ id: string; isPopular: boolean }, string>(
    api.tv.togglePopular
  );
  const removePlaylist = useMutation<{ id: string }, string>(api.tv.removePlaylist);
  const importM3U = useAction<
    { m3uUrl: string; playlistId?: string; country?: string; language?: string },
    { total: number; added: number; updated: number; failed: number; failures: string[] }
  >(api.tv.seedFromM3U);
  const probeChannel = useAction<
    { channelId: string },
    {
      channelId: string;
      name: string;
      streamStatus: 'online' | 'offline';
      lastStreamError?: string;
    }
  >(api.tv.probeChannel);
  const probeAll = useAction<
    { batchSize?: number; onlyActive?: boolean; deactivateAfterFailures?: number },
    {
      processed: number;
      online: number;
      offline: number;
      deactivated: number;
      sampleErrors: Array<{ name: string; error: string }>;
    }
  >(api.tv.probeAllChannels);
  const seedPopular = useMutation<
    { dryRun?: boolean },
    { added: number; updated: number; skipped: number; total: number; dryRun: boolean }
  >(api.seedPopularChannels.seedPopularChannels);
  const cleanupNonWorking = useAction<
    { dryRun?: boolean; threshold?: number; deleteOlderThanDays?: number },
    {
      dryRun: boolean;
      wouldDeactivate?: number;
      wouldDelete?: number;
      sample?: Array<{ id: string; name: string; reasons: string[] }>;
      deactivated?: number;
      deleted?: number;
    }
  >(api.tv.cleanupNonWorking);

  useEffect(() => {
    setOffset(0);
    setAcc([]);
  }, [search, statusFilter, mode]);

  useEffect(() => {
    if (!channels) return;
    if (channels.offset === 0) {
      setAcc(channels.items);
      return;
    }
    setAcc((prev) => {
      const seen = new Set(prev.map((c) => c._id));
      return [...prev, ...channels.items.filter((c) => !seen.has(c._id))];
    });
  }, [channels]);

  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [probingAll, setProbingAll] = useState(false);
  const [seedingPopular, setSeedingPopular] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);

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

  const handleTogglePopular = async (ch: TVChannelRow) => {
    try {
      await togglePopular({ id: ch._id as any, isPopular: !ch.isPopular });
      toast.success(ch.isPopular ? 'Quitado de populares' : 'Marcado como popular');
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
    if (!confirm(`¿Reimportar la lista "${pl.name}"?`)) return;
    setImportingId(pl._id);
    try {
      const result = await importM3U({
        m3uUrl: pl.m3uUrl,
        playlistId: pl._id,
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

  const handleProbe = async (ch: TVChannelRow) => {
    setProbingId(ch._id);
    try {
      const result = await probeChannel({ channelId: ch._id as any });
      if (result.streamStatus === 'online') {
        toast.success(`✓ ${ch.name} está en línea`);
      } else {
        toast.error(`${ch.name}: ${result.lastStreamError ?? 'Stream no disponible'}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al verificar');
    } finally {
      setProbingId(null);
    }
  };

  const handleProbeAll = async () => {
    if (
      !confirm(
        '¿Probar todos los canales activos? Esto puede tardar varios minutos y desactivará los canales que fallen 2 veces seguidas.'
      )
    )
      return;
    setProbingAll(true);
    try {
      const result = await probeAll({
        batchSize: 8,
        onlyActive: true,
        deactivateAfterFailures: 2,
      });
      toast.success(
        `Listo: ${result.online} online · ${result.offline} offline · ${result.deactivated} desactivados`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al probar');
    } finally {
      setProbingAll(false);
    }
  };

  const handleSeedPopular = async () => {
    if (
      !confirm(
        '¿Sembrar canales populares curados? Si ya existen con el mismo streamUrl se actualizarán y se marcarán como populares.'
      )
    )
      return;
    setSeedingPopular(true);
    try {
      const result = await seedPopular({});
      toast.success(`Canales curados: ${result.added} nuevos · ${result.updated} actualizados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al sembrar');
    } finally {
      setSeedingPopular(false);
    }
  };

  const handleCleanupNonWorking = async () => {
    if (
      !confirm(
        '¿Limpiar canales que no funcionan o no son español?\n\n' +
          'Se DESACTIVARÁN (no se borran) los canales:\n' +
          '  • con language != es\n' +
          '  • con errores de geo-bloqueo\n' +
          '  • con streamStatus = OFFLINE\n' +
          '  • con nombres en otros idiomas / extranjeros conocidos\n\n' +
          'Primero se hace un DRY-RUN para mostrarte la lista.'
      )
    )
      return;
    setCleanupRunning(true);
    try {
      // Paso 1: dry-run para mostrar preview
      const preview = await cleanupNonWorking({ dryRun: true });
      const previewSample = (preview.sample ?? [])
        .slice(0, 10)
        .map((c) => `  · ${c.name} (${c.reasons.join(', ')})`)
        .join('\n');
      const confirmMsg =
        `DRY-RUN: se desactivarían ${preview.wouldDeactivate ?? 0} canales.\n\n` +
        `Muestra:\n${previewSample}\n\n` +
        `¿Aplicar los cambios?`;
      if (!confirm(confirmMsg)) {
        toast.info('Cancelado por el usuario');
        return;
      }
      // Paso 2: aplicar
      const result = await cleanupNonWorking({ dryRun: false });
      toast.success(
        `Limpieza aplicada: ${result.deactivated ?? 0} desactivados · ${result.deleted ?? 0} borrados`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al limpiar');
    } finally {
      setCleanupRunning(false);
    }
  };

  const tabs: { value: Mode; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { value: 'channels', label: 'Canales', icon: Tv },
      { value: 'popular', label: 'Populares', icon: Star },
      { value: 'playlists', label: 'Listas M3U', icon: ListVideo },
    ];

  const channelItems = acc;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 pb-5 border-b border-cinema-border/60">
        <div>
          <p className="text-label uppercase text-cinema-accent mb-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
            Señales en vivo
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-cinema-chalk">
            Canales TV
          </h1>
          <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
            {mode === 'playlists'
              ? playlists
                ? `${playlists.length} listas M3U`
                : 'Cargando...'
              : channels
                ? `${channels.total} canales (${channels.items.length} mostrados)`
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
        ) : mode === 'popular' ? (
          <Button
            className="w-full sm:w-auto"
            onClick={handleSeedPopular}
            disabled={seedingPopular}
          >
            {seedingPopular ? (
              <>
                <Spinner className="w-4 h-4" />
                Sembrando...
              </>
            ) : (
              <>
                <Star className="w-4 h-4" />
                Sembrar canales populares
              </>
            )}
          </Button>
        ) : (
          <Link href="/admin/tv/playlists" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Nueva lista M3U
            </Button>
          </Link>
        )}
      </div>

      {stats && mode !== 'playlists' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatChip icon={Tv} label="Total" value={stats.total} accent="text-cinema-accent-light" />
          <StatChip
            icon={Activity}
            label="Online"
            value={stats.online}
            accent="text-cinema-success"
          />
          <StatChip icon={RefreshCw} label="Offline" value={stats.offline} accent="text-red-300" />
          <StatChip icon={Zap} label="Sin probar" value={stats.unknown} accent="text-cinema-ash" />
          <StatChip
            icon={Star}
            label="Populares"
            value={stats.popular}
            accent="text-cinema-accent"
          />
          <StatChip icon={Tv} label="Activos" value={stats.active} accent="text-cinema-teal" />
        </div>
      )}

      {mode !== 'playlists' && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleProbeAll}
            disabled={probingAll}
            className="w-full sm:w-auto"
          >
            {probingAll ? (
              <>
                <LoaderIcon spinning /> Probando todos...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                Probar todos los canales activos
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCleanupNonWorking}
            disabled={cleanupRunning}
            className="w-full sm:w-auto"
          >
            {cleanupRunning ? (
              <>
                <LoaderIcon spinning /> Limpiando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Limpiar canales que no funcionan
              </>
            )}
          </Button>
          <p className="text-xs text-cinema-ash">
            Probar actualiza estado · Limpiar desactiva canales OFFLINE / no-español (con preview).
          </p>
        </div>
      )}

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
                  ? 'bg-cinema-accent/20 text-cinema-chalk border-cinema-accent/40'
                  : 'text-cinema-muted border-cinema-border hover:text-cinema-chalk hover:border-cinema-silver/30'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(mode === 'channels' || mode === 'popular') && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                { value: '', label: 'Todos' },
                { value: 'online', label: 'Online' },
                { value: 'offline', label: 'Offline' },
                { value: 'unknown', label: 'Sin probar' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value as typeof statusFilter)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors border whitespace-nowrap shrink-0',
                  statusFilter === opt.value
                    ? 'bg-cinema-accent/20 text-cinema-chalk border-cinema-accent/40'
                    : 'text-cinema-muted border-cinema-border hover:text-cinema-chalk hover:border-cinema-silver/30'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

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
          ) : channelItems.length === 0 ? (
            <div className="text-center py-24 text-cinema-muted">
              No hay canales con ese filtro.
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {channelItems.map((ch) => (
                  <ChannelCard
                    key={ch._id}
                    ch={ch}
                    probingId={probingId}
                    onProbe={handleProbe}
                    onToggle={handleToggle}
                    onTogglePopular={handleTogglePopular}
                    onDelete={handleDeleteChannel}
                    deletingId={deletingChannelId}
                  />
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-[2px] border border-cinema-border bg-cinema-surface">
                <table className="admin-table w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-cinema-border text-left text-cinema-muted">
                      <th className="px-4 py-3 font-medium">Canal</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Categoría</th>
                      <th className="px-4 py-3 font-medium">País</th>
                      <th className="px-4 py-3 font-medium">Popular</th>
                      <th className="px-4 py-3 font-medium">Última prueba</th>
                      <th className="px-4 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelItems.map((ch) => (
                      <tr
                        key={ch._id}
                        className="border-b border-cinema-border/60 hover:bg-cinema-elevated/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-[2px] bg-cinema-elevated border border-cinema-border flex items-center justify-center overflow-hidden">
                              {ch.logo ? (
                                <img
                                  src={ch.logo}
                                  alt={ch.name}
                                  className="w-8 h-8 object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <Radio className="w-5 h-5 text-cinema-silver" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-cinema-chalk truncate max-w-[240px]">
                                {ch.name}
                              </p>
                              <p className="text-[10px] text-cinema-ash truncate max-w-[240px]">
                                {ch.source || 'manual'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ch.streamStatus} />
                        </td>
                        <td className="px-4 py-3 text-cinema-muted">{ch.category}</td>
                        <td className="px-4 py-3 text-cinema-muted">{ch.country ?? '—'}</td>
                        <td className="px-4 py-3">
                          {ch.isPopular ? (
                            <Star className="w-4 h-4 text-cinema-accent fill-cinema-accent" />
                          ) : (
                            <span className="text-cinema-ash">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-cinema-muted text-xs">
                          {formatDate(ch.lastCheckedAt)}
                          {ch.lastStreamError ? (
                            <p
                              className="text-[10px] text-red-400 truncate max-w-[180px]"
                              title={ch.lastStreamError}
                            >
                              {ch.lastStreamError}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChannelActions
                            ch={ch}
                            probingId={probingId}
                            deletingId={deletingChannelId}
                            onProbe={handleProbe}
                            onToggle={handleToggle}
                            onTogglePopular={handleTogglePopular}
                            onDelete={handleDeleteChannel}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {channels.hasMore && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOffset((n) => n + 48)}
                    className="px-4 py-2 rounded-[10px] border border-cinema-border text-sm text-cinema-chalk hover:border-cinema-accent/40"
                  >
                    Cargar más
                  </button>
                  <p className="text-xs text-cinema-ash">
                    Mostrando {channelItems.length} de {channels.total}
                  </p>
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
                <article
                  key={pl._id}
                  className="rounded-[2px] border border-cinema-border bg-cinema-surface p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-[2px] bg-cinema-accent/15 text-cinema-accent-light">
                        <ListVideo className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg uppercase tracking-wide text-cinema-chalk">
                          {pl.name}
                        </h3>
                        <p className="text-xs text-cinema-muted mt-0.5">
                          {pl.country ?? 'Sin país'} · {pl.language ?? 'es'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold',
                        pl.isActive
                          ? 'bg-cinema-success/20 text-cinema-success'
                          : 'bg-cinema-elevated text-cinema-muted'
                      )}
                    >
                      {pl.isActive ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="text-xs text-cinema-ash break-all bg-cinema-elevated/40 rounded-[2px] p-2 line-clamp-2">
                    {pl.m3uUrl}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-[2px] bg-cinema-elevated/40 p-2">
                      <p className="text-cinema-ash text-[10px] uppercase tracking-wider">
                        Canales
                      </p>
                      <p className="text-cinema-chalk font-medium text-base mt-0.5">
                        {pl.totalChannels ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-[2px] bg-cinema-elevated/40 p-2">
                      <p className="text-cinema-ash text-[10px] uppercase tracking-wider">
                        Última importación
                      </p>
                      <p className="text-cinema-chalk font-medium mt-0.5">
                        {formatDate(pl.lastImportedAt)}
                      </p>
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
                          {pl.lastImportedAt ? (
                            <RefreshCw className="w-4 h-4" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          {pl.lastImportedAt ? 'Reimportar' : 'Importar ahora'}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Eliminar"
                      className="ml-auto"
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
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChannelCard({
  ch,
  probingId,
  deletingId,
  onProbe,
  onToggle,
  onTogglePopular,
  onDelete,
}: {
  ch: TVChannelRow;
  probingId: string | null;
  deletingId: string | null;
  onProbe: (ch: TVChannelRow) => void;
  onToggle: (ch: TVChannelRow) => void;
  onTogglePopular: (ch: TVChannelRow) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <article className="rounded-[2px] border border-cinema-border bg-cinema-surface p-4">
      <div className="flex gap-3">
        <div className="w-14 h-14 shrink-0 rounded-[2px] bg-cinema-elevated border border-cinema-border flex items-center justify-center overflow-hidden">
          {ch.logo ? (
            <img src={ch.logo} alt={ch.name} className="w-10 h-10 object-contain" />
          ) : (
            <Radio className="w-6 h-6 text-cinema-silver" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-sm leading-snug text-cinema-chalk truncate">
              {ch.name}
            </h3>
            {ch.isPopular && (
              <Star className="w-3 h-3 text-cinema-accent fill-cinema-accent shrink-0" />
            )}
          </div>
          <p className="text-xs text-cinema-muted mt-0.5 truncate">
            {ch.category} {ch.country ? `· ${ch.country}` : ''}
          </p>
          <p className="text-xs text-cinema-ash mt-1">
            <StatusBadge status={ch.streamStatus} />
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-cinema-border/60 flex items-center justify-end gap-1 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Probar"
          onClick={() => onProbe(ch)}
          disabled={probingId === ch._id}
        >
          {probingId === ch._id ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <Activity className="w-4 h-4 text-cinema-accent-light" />
          )}
        </Button>
        <Button variant="ghost" size="sm" aria-label="Popular" onClick={() => onTogglePopular(ch)}>
          <Star
            className={cn(
              'w-4 h-4',
              ch.isPopular ? 'text-cinema-accent fill-cinema-accent' : 'text-cinema-ash'
            )}
          />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={ch.isActive ? 'Desactivar' : 'Activar'}
          onClick={() => onToggle(ch)}
        >
          {ch.isActive ? (
            <ToggleRight className="w-4 h-4 text-cinema-success" />
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
          disabled={deletingId === ch._id}
          onClick={() => onDelete(ch._id, ch.name)}
        >
          {deletingId === ch._id ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <Trash2 className="w-4 h-4 text-red-400" />
          )}
        </Button>
      </div>
    </article>
  );
}

function ChannelActions({
  ch,
  probingId,
  deletingId,
  onProbe,
  onToggle,
  onTogglePopular,
  onDelete,
}: {
  ch: TVChannelRow;
  probingId: string | null;
  deletingId: string | null;
  onProbe: (ch: TVChannelRow) => void;
  onToggle: (ch: TVChannelRow) => void;
  onTogglePopular: (ch: TVChannelRow) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Probar"
        onClick={() => onProbe(ch)}
        disabled={probingId === ch._id}
      >
        {probingId === ch._id ? (
          <Spinner className="w-4 h-4" />
        ) : (
          <Activity className="w-4 h-4 text-cinema-accent-light" />
        )}
      </Button>
      <Button variant="ghost" size="sm" aria-label="Popular" onClick={() => onTogglePopular(ch)}>
        <Star
          className={cn(
            'w-4 h-4',
            ch.isPopular ? 'text-cinema-accent fill-cinema-accent' : 'text-cinema-ash'
          )}
        />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={ch.isActive ? 'Desactivar' : 'Activar'}
        onClick={() => onToggle(ch)}
      >
        {ch.isActive ? (
          <ToggleRight className="w-4 h-4 text-cinema-success" />
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
        disabled={deletingId === ch._id}
        onClick={() => onDelete(ch._id, ch.name)}
      >
        {deletingId === ch._id ? (
          <Spinner className="w-4 h-4" />
        ) : (
          <Trash2 className="w-4 h-4 text-red-400" />
        )}
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status?: 'online' | 'offline' | 'unknown' }) {
  const map = {
    online: { label: 'Online', className: 'bg-cinema-success/20 text-cinema-success' },
    offline: { label: 'Offline', className: 'bg-red-500/20 text-red-300' },
    unknown: { label: 'Sin probar', className: 'bg-cinema-elevated text-cinema-ash' },
  } as const;
  const cfg = map[status ?? 'unknown'];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full',
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-[2px] bg-cinema-surface border border-cinema-border p-3">
      <div className="flex items-center gap-2 text-cinema-ash">
        <Icon className={cn('w-4 h-4', accent)} />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-cinema-chalk mt-1">{value}</p>
    </div>
  );
}

function LoaderIcon({ spinning }: { spinning: boolean }) {
  return <Loader2 className={cn('w-4 h-4', spinning && 'animate-spin')} />;
}
