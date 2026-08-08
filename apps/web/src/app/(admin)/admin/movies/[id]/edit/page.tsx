'use client';

import { useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { Spinner } from '@pelis/ui/components';
import { MovieForm, type MovieFormValues } from '../../../components/movie-form';
import type { MediaItem } from '@pelis/ui/types';

export default function EditMoviePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const movieId = params.id;

  const movie = useQuery(api.movies.getById, { id: movieId as any }) as MediaItem | null | undefined;
  const updateMovie = useMutation(api.movies.update);
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
      await updateMovie({
        id: movieId as any,
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
      toast.success('Película actualizada');
      router.push('/admin/movies');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  if (movie === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" role="status">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="text-center py-24 text-cinema-muted">
        Película no encontrada.{' '}
        <Link href="/admin/movies" className="text-cinema-violet-light hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

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
        Editar película
      </h1>

      <MovieForm
        initialValues={{
          name: movie.name,
          image: movie.image,
          synopsis: movie.synopsis,
          genre: movie.genre,
          token: movie.token,
          actors: movie.actors,
          classification: movie.classification,
          releaseYear: movie.releaseYear,
          videoUrl: movie.videoUrl ?? '',
          mediaType: movie.mediaType ?? 'movie',
          episodes: movie.episodes?.toString() ?? '',
          featured: movie.featured ?? false,
        }}
        genres={genres.includes(movie.genre) ? genres : [movie.genre, ...genres]}
        classifications={
          classifications.includes(movie.classification)
            ? classifications
            : [movie.classification, ...classifications]
        }
        onSubmit={handleSubmit}
        onUploadImage={handleUploadImage}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
