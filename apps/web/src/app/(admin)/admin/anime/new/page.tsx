'use client';

import { useMutation } from '@pelis/db/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { AnimeForm, type AnimeFormValues } from '../anime-form';

function parseProviders(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, url, lang] = line.split('|').map((s) => s.trim());
      const language = (lang === 'dub' || lang === 'esp' ? lang : 'sub') as 'sub' | 'dub' | 'esp';
      return {
        name: name || 'Proveedor',
        url: url || '',
        language,
        isActive: true,
      };
    })
    .filter((p) => p.url);
}

function buildArgs(values: AnimeFormValues) {
  const genre = values.genreText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: values.title.trim(),
    alternativeTitle: values.alternativeTitle.trim() || undefined,
    image: values.image.trim(),
    synopsis: values.synopsis.trim(),
    genre: genre.length ? genre : ['Anime'],
    episodes: Number(values.episodes),
    status: values.status,
    year: Number(values.year),
    rating: values.rating ? Number(values.rating) : undefined,
    anilistId: values.anilistId ? Number(values.anilistId) : undefined,
    malId: values.malId ? Number(values.malId) : undefined,
    providers: parseProviders(values.providersText),
  };
}

export default function NewAnimePage() {
  const router = useRouter();
  const create = useMutation(api.adminAnime.create);

  const handleSubmit = async (values: AnimeFormValues) => {
    try {
      await create(buildArgs(values));
      toast.success('Anime creado');
      router.push('/admin/anime');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear');
    }
  };

  return (
    <div>
      <Link
        href="/admin/anime"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase mb-6 sm:mb-8">
        Nuevo anime
      </h1>

      <AnimeForm onSubmit={handleSubmit} submitLabel="Crear anime" />
    </div>
  );
}
