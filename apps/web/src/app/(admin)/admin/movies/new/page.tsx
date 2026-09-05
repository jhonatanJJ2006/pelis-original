'use client';

import { useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { MovieForm, type MovieFormValues } from '../../components/movie-form';

export default function NewMoviePage() {
  const router = useRouter();
  const createMovie = useMutation(api.movies.create);
  const generateUploadUrl = useMutation(api.movies.generateUploadUrl);

  const genres = (useQuery(api.movies.getGenres, {}) as string[] | undefined) ?? [];
  const classifications = (useQuery(api.movies.getClassifications, {}) as string[] | undefined) ?? [
    'G',
    'PG',
    'PG-13',
    'R',
    'NC-17',
  ];

  const handleUploadImage = async (file: File) => {
    const uploadUrl = (await generateUploadUrl({})) as string;
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('filename', file.name);
    const response = await fetch(uploadUrl, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Upload failed (${response.status}): ${errText}`);
    }
    const data = (await response.json()) as { id: string; url: string };
    return { image: data.url, imageId: data.id };
  };

  const handleSubmit = async (values: MovieFormValues) => {
    try {
      const id = await createMovie({
        name: values.name.trim(),
        image: values.image.trim(),
        imageId: values.imageId as any,
        synopsis: values.synopsis.trim(),
        genre: values.genre.trim(),
        token: values.token.trim(),
        actors: values.actors.trim(),
        classification: values.classification.trim(),
        releaseYear: values.releaseYear.trim(),
        videoUrl: values.videoUrl.trim() || undefined,
        mediaType: values.mediaType,
        episodes: values.episodes ? Number(values.episodes) : undefined,
        featured: values.featured,
      });
      toast.success('Película creada');
      router.push(`/admin/movies/${id}/edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear');
    }
  };

  return (
    <div>
      <Link
        href="/admin/movies"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase mb-6 sm:mb-8">
        Nueva película
      </h1>

      <MovieForm
        genres={genres}
        classifications={classifications}
        onSubmit={handleSubmit}
        onUploadImage={handleUploadImage}
        submitLabel="Crear película"
      />
    </div>
  );
}
