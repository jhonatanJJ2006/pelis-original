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
import { EnrichMovieModal } from '../../../components/enrich-movie-modal';
import { MovieForm, type MovieFormValues } from '../../../components/movie-form';
import type { MediaItem } from '@pelis/ui/types';

export default function EditMoviePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const movieId = params.id;
  const [showEnrich, setShowEnrich] = useState(false);

  const movie = useQuery<MediaItem>(api.movies.getById, { id: movieId as any }) as
    MediaItem | null | undefined;
  const updateMovie = useMutation(api.movies.update);
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

  const handleSubmit = async (values: MovieFormValues, intent?: 'save' | 'continue') => {
    try {
      const subtitleTracks = values.subtitleTracksJson.trim()
        ? (JSON.parse(values.subtitleTracksJson) as Array<{
            lang: string;
            label?: string;
            path: string;
          }>)
        : undefined;
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
        subtitleTracks,
        mediaType: values.mediaType,
        episodes: values.episodes ? Number(values.episodes) : undefined,
        featured: values.featured,
      });
      toast.success('Película actualizada');
      if (intent !== 'continue') {
        router.push('/admin/movies');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  if (movie === undefined) {
    return <AdminFormSkeleton />;
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
          Editar película
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
          subtitleTracksJson: movie.subtitleTracks
            ? JSON.stringify(movie.subtitleTracks, null, 2)
            : '',
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
        mode="edit"
      />

      {showEnrich && (
        <EnrichMovieModal
          movie={{
            _id: movie._id,
            name: movie.name,
            token: movie.token,
            image: movie.image,
            backdropImage: movie.backdropImage,
          }}
          onClose={() => setShowEnrich(false)}
          onEnriched={() => setShowEnrich(false)}
        />
      )}
    </div>
  );
}
