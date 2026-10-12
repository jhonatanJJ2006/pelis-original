'use client';

import { useMutation } from '@pelis/db/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { ChannelForm, type ChannelFormValues } from '../channel-form';

function buildArgs(values: ChannelFormValues) {
  return {
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
  };
}

export default function NewTVChannelPage() {
  const router = useRouter();
  const create = useMutation(api.tv.addChannel);

  const handleSubmit = async (values: ChannelFormValues) => {
    try {
      await create(buildArgs(values));
      toast.success('Canal creado');
      router.push('/admin/tv');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear');
    }
  };

  return (
    <div>
      <Link
        href="/admin/tv"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-cinema-chalk transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a canales
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-cinema-chalk mb-6 sm:mb-8">
        Nuevo canal
      </h1>

      <ChannelForm onSubmit={handleSubmit} submitLabel="Crear canal" />
    </div>
  );
}
