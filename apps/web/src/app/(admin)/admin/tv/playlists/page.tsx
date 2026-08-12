'use client';

import { useAction, useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Download, RefreshCw, Trash2, ListVideo, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db';
import { Button, Input, Select, Spinner } from '@pelis/ui/components';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { cn } from '@pelis/ui/utils';

interface PlaylistRow {
  _id: string;
  name: string;
  m3uUrl: string;
  country?: string;
  language?: string;
  isActive: boolean;
  lastImportedAt?: number;
  totalChannels?: number;
}

const KNOWN_COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'Ecuador', 'El Salvador', 'España', 'Estados Unidos', 'Guatemala',
  'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú',
  'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela',
];

const KNOWN_LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' },
];

function formatDate(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminTVPlaylistsPage() {
  const playlists = useQuery(api.tv.listPlaylists, {}) as PlaylistRow[] | undefined;
  const create = useMutation<{ name: string; m3uUrl: string; country?: string; language?: string; isActive: boolean }, string>(api.tv.createPlaylist);
  const remove = useMutation<{ id: string }, string>(api.tv.removePlaylist);
  const importM3U = useAction<{ m3uUrl: string; playlistId?: string; country?: string; language?: string }, { total: number; added: number; updated: number; failed: number; failures: string[] }>(api.tv.seedFromM3U);

  const [form, setForm] = useState({
    name: '',
    m3uUrl: '',
    country: '',
    language: 'es',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importAfterCreate, setImportAfterCreate] = useState(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Nombre requerido';
    if (!form.m3uUrl.trim()) nextErrors.m3uUrl = 'URL requerida';
    if (!form.m3uUrl.startsWith('http')) nextErrors.m3uUrl = 'URL inválida';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const id = await create({
        name: form.name.trim(),
        m3uUrl: form.m3uUrl.trim(),
        country: form.country.trim() || undefined,
        language: form.language.trim() || 'es',
        isActive: form.isActive,
      });
      toast.success('Lista creada');
      if (importAfterCreate) {
        try {
          setImportingId(id);
          const result = await importM3U({
            m3uUrl: form.m3uUrl.trim(),
            playlistId: id,
            country: form.country.trim() || undefined,
            language: form.language.trim() || undefined,
          });
          toast.success(
            `Importados: ${result.added} · Actualizados: ${result.updated} · Fallidos: ${result.failed}`
          );
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Error al importar');
        } finally {
          setImportingId(null);
        }
      }
      setForm({ name: '', m3uUrl: '', country: '', language: 'es', isActive: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReimport = async (pl: PlaylistRow) => {
    if (!confirm(`¿Reimportar "${pl.name}"?`)) return;
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

  const handleDelete = async (pl: PlaylistRow) => {
    if (
      !confirm(
        `¿Eliminar la lista "${pl.name}"? Sus canales se desvinculan (no se borran).`
      )
    )
      return;
    setDeletingId(pl._id);
    try {
      await remove({ id: pl._id as any });
      toast.success('Lista eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/tv"
          className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a canales
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
          Listas M3U
        </h1>
        <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
          Importa listas IPTV estilo Magis / Xuper. La primera vez se ejecuta la importación al guardar.
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-cinema-border bg-cinema-surface p-5 space-y-4 max-w-3xl">
        <h2 className="font-semibold text-white text-lg">Agregar lista</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={errors.name}
            placeholder="Mi lista IPTV"
          />
          <Input
            label="URL M3U/M3U8"
            value={form.m3uUrl}
            onChange={(e) => setForm((f) => ({ ...f, m3uUrl: e.target.value }))}
            error={errors.m3uUrl}
            placeholder="https://raw.githubusercontent.com/iptv-org/iptv/main/index.m3u"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="País"
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
          >
            <option value="">Sin país</option>
            {KNOWN_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Idioma"
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          >
            {KNOWN_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
          <label className="inline-flex items-end gap-2 text-sm text-cinema-muted cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-cinema-border bg-cinema-surface text-cinema-accent focus:ring-cinema-accent/50"
            />
            Lista activa
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-cinema-ash cursor-pointer">
          <input
            type="checkbox"
            checked={importAfterCreate}
            onChange={(e) => setImportAfterCreate(e.target.checked)}
            className="rounded border-cinema-border bg-cinema-surface text-cinema-accent focus:ring-cinema-accent/50"
          />
          Importar canales inmediatamente al guardar
        </label>
        <div>
          <Button type="submit" disabled={isSubmitting || importingId !== null}>
            {isSubmitting ? (
              <>
                <Spinner className="w-4 h-4" />
                Guardando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Crear lista
              </>
            )}
          </Button>
        </div>
      </form>

      <div>
        <h2 className="font-semibold text-white text-lg mb-4">Listas existentes</h2>
        {playlists === undefined ? (
          <AdminTableSkeleton />
        ) : playlists.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-cinema-border bg-cinema-surface/40 text-cinema-muted">
            <ListVideo className="w-10 h-10 mx-auto mb-3 text-cinema-ash" />
            <p>No hay listas todavía. Agrega la primera arriba.</p>
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
                    onClick={() => handleReimport(pl)}
                    disabled={importingId === pl._id}
                  >
                    {importingId === pl._id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        {pl.lastImportedAt ? <RefreshCw className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        {pl.lastImportedAt ? 'Reimportar' : 'Importar'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Eliminar"
                    className="ml-auto"
                    disabled={deletingId === pl._id}
                    onClick={() => handleDelete(pl)}
                  >
                    {deletingId === pl._id ? (
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
      </div>
    </div>
  );
}