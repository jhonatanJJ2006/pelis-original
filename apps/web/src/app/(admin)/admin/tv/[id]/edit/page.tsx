'use client';

import { useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { AdminFormSkeleton } from '@pelis/ui/features/admin-form-skeleton';
import { ChannelForm, type ChannelFormValues } from '../../channel-form';

export default function EditTVChannelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const channel = useQuery(api.tv.getById, { id: id as any });
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

  if (channel === undefined) {
    return <AdminFormSkeleton />;
  }

  if (!channel) {
    return (
      <div className="text-center py-24 text-cinema-muted">
        Canal no encontrado.{' '}
        <Link href="/admin/tv" className="text-cinema-violet-light hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/tv"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a canales
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase mb-6 sm:mb-8">
        Editar canal
      </h1>

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