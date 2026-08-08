'use client';

import { useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { MovieForm, type MovieFormValues } from '../components/movie-form';

export default function NewMoviePage() {
  const router = useRouter();
  const createMovie = useMutation(api.movies.create);
  const generateUploadUrl = useMutation(api.movies.generateUploadUrl);

  const genres = (useQuery(api.movies.getGenres, {}) as string[] | undefined) ?? [];
  const classifications =
    (useQuery(api.movies.getClassifications, {}) as string[] | undefined) ?? [
      'G',
      'PG',
      'PG-13',
      'R',
      'NC-17',
    ];

  const handleUploadImage = async (file: File) => {
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    const { storageId } = await response.json();
    return { image: URL.createObjectURL(file), imageId: storageId };
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

      <h1 className="font-display text-3xl tracking-wide text-white uppercase mb-8">
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
