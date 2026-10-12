'use client';

import { useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { Button } from '@pelis/ui/components';
import { AdminFormSkeleton } from '@pelis/ui/features/admin-form-skeleton';
import { AnimeForm, type AnimeFormValues } from '../../anime-form';
import { EnrichAnimeModal } from '../../../components/enrich-anime-modal';

function providersToText(providers: { name: string; url: string; language: string }[]) {
  return providers.map((p) => `${p.name} | ${p.url} | ${p.language}`).join('\n');
}

function buildArgs(id: string, values: AnimeFormValues) {
  const genre = values.genreText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const providers = values.providersText
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

  return {
    id: id as any,
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
    providers,
  };
}

export default function EditAnimePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [showEnrich, setShowEnrich] = useState(false);

  const anime = useQuery<any>(api.adminAnime.getById, { id: id as any });
  const update = useMutation(api.adminAnime.update);

  const handleSubmit = async (values: AnimeFormValues) => {
    try {
      await update(buildArgs(id, values));
      toast.success('Anime actualizado');
      router.push('/admin/anime');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  if (anime === undefined) {
    return <AdminFormSkeleton />;
  }

  if (!anime) {
    return (
      <div className="text-center py-24 text-cinema-muted">
        Anime no encontrado.{' '}
        <Link href="/admin/anime" className="text-cinema-accent-light hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/anime"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-cinema-chalk transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-cinema-chalk">
          Editar anime
        </h1>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => setShowEnrich(true)}
        >
          <Sparkles className="w-4 h-4" />
          Completar desde TMDB
        </Button>
      </div>

      <AnimeForm
        initialValues={{
          title: anime.title,
          alternativeTitle: anime.alternativeTitle ?? '',
          image: anime.image,
          synopsis: anime.synopsis,
          genreText: anime.genre.join(', '),
          episodes: anime.episodes.toString(),
          status: anime.status,
          year: anime.year.toString(),
          rating: anime.rating?.toString() ?? '',
          anilistId: anime.anilistId?.toString() ?? '',
          malId: anime.malId?.toString() ?? '',
          providersText: providersToText(anime.providers ?? []),
        }}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />

      {showEnrich && (
        <EnrichAnimeModal
          anime={{
            _id: anime._id,
            title: anime.title,
            image: anime.image,
            backdropImage: anime.backdropImage,
          }}
          onClose={() => setShowEnrich(false)}
          onEnriched={() => setShowEnrich(false)}
        />
      )}
    </div>
  );
}
