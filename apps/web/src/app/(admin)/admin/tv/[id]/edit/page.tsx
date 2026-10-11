'use client';

import { useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { Button, Spinner } from '@pelis/ui/components';
import { AdminFormSkeleton } from '@pelis/ui/features/admin-form-skeleton';
import { cn } from '@pelis/ui/utils';
import { ChannelForm, type ChannelFormValues } from '../../channel-form';
import { useState } from 'react';
import { probeTvChannel } from '@/lib/tv-probe-client';

function formatDate(ts?: number) {
  if (!ts) return 'Sin verificar';
  return new Date(ts).toLocaleString('es', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function EditTVChannelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [checking, setChecking] = useState(false);

  const channel = useQuery<any>(api.tv.adminGetById, { id: id as any });
  const update = useMutation(api.tv.updateChannel);

  const handleSubmit = async (values: ChannelFormValues) => {
    try {
      await update({
        id: id as any,
        name: values.name.trim(),
        logo: values.logo.trim(),
        category: values.category.trim(),
        country: values.country.trim() || undefined,
        language: values.language.trim() || undefined,
        streamUrl: values.streamUrl.trim(),
        source: values.source.trim() || 'manual',
        tvgId: values.tvgId.trim() || undefined,
        isActive: values.isActive,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
      });
      toast.success('Canal actualizado');
      router.push('/admin/tv');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const result = await probeTvChannel(id);
      if (result.streamStatus === 'online') {
        toast.success('Stream online');
      } else {
        toast.error(result.lastStreamError ?? 'Stream caído');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al verificar');
    } finally {
      setChecking(false);
    }
  };

  if (channel === undefined) {
    return <AdminFormSkeleton />;
  }

  if (!channel) {
    return (
      <div className="text-center py-24 text-cinema-muted">
        Canal no encontrado.{' '}
        <Link href="/admin/tv" className="text-cinema-accent-light hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/tv"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-cinema-chalk transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a canales
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-cinema-chalk mb-4 sm:mb-6">
        Editar canal
      </h1>

      <div className="mb-6 rounded-lg border border-cinema-border bg-cinema-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-cinema-muted uppercase tracking-wider mb-1">
            Estado del stream
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium',
                channel.streamStatus === 'online' && 'bg-emerald-500/20 text-emerald-300',
                channel.streamStatus === 'offline' && 'bg-red-500/20 text-red-300',
                (!channel.streamStatus || channel.streamStatus === 'unknown') &&
                  'bg-cinema-elevated text-cinema-muted'
              )}
            >
              {channel.streamStatus === 'online'
                ? 'Online'
                : channel.streamStatus === 'offline'
                  ? 'Caído'
                  : 'Sin verificar'}
            </span>
            <span className="text-xs text-cinema-muted">
              Última verificación: {formatDate(channel.lastCheckedAt)}
            </span>
          </div>
          {channel.lastStreamError && (
            <p className="text-xs text-red-300/80 mt-2">{channel.lastStreamError}</p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={handleCheck} disabled={checking}>
          {checking ? (
            <>
              <Spinner className="w-4 h-4" />
              Verificando...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              Probar stream
            </>
          )}
        </Button>
      </div>

      <ChannelForm
        initialValues={{
          name: channel.name,
          logo: channel.logo,
          category: channel.category,
          country: channel.country ?? '',
          language: channel.language ?? 'es',
          streamUrl: channel.streamUrl,
          source: channel.source,
          tvgId: channel.tvgId ?? '',
          isActive: channel.isActive,
          sortOrder: channel.sortOrder?.toString() ?? '1000',
        }}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
