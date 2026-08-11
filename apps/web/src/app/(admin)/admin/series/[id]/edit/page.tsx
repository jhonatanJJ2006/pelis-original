'use client';

import { useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { AdminFormSkeleton } from '@pelis/ui/features/admin-form-skeleton';
import { SeriesForm, type SeriesFormValues } from '../../series-form';

export default function EditSeriesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const series = useQuery(api.adminSeries.getById, { id: id as any });
  const update = useMutation(api.adminSeries.update);

  const moviesGenres = (useQuery(api.movies.getGenres, {}) as string[] | undefined) ?? [];
  const classifications =
    (useQuery(api.movies.getClassifications, {}) as string[] | undefined) ?? [
      'G',
      'PG',
      'PG-13',
      'R',
      'NC-17',
    ];

  const handleSubmit = async (values: SeriesFormValues) => {
    try {
      await update({
        id: id as any,
        name: values.name.trim(),
        image: values.image.trim(),
        synopsis: values.synopsis.trim(),
        genre: values.genre.trim(),
        token: values.token.trim(),
        actors: values.actors.trim(),
        classification: values.classification.trim(),
        releaseYear: values.releaseYear.trim(),
        episodes: values.episodes ? Number(values.episodes) : undefined,
        season: values.season ? Number(values.season) : undefined,
        featured: values.featured,
      });
      toast.success('Serie actualizada');
      router.push('/admin/series');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  if (series === undefined) {
    return <AdminFormSkeleton />;
  }

  if (!series) {
    return (
      <div className="text-center py-24 text-cinema-muted">
        Serie no encontrada.{' '}
        <Link href="/admin/series" className="text-cinema-violet-light hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/series"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase mb-6 sm:mb-8">
        Editar serie
      </h1>

      <SeriesForm
        initialValues={{
          name: series.name,
          image: series.image,
          synopsis: series.synopsis,
          genre: series.genre,
          token: series.token,
          actors: series.actors,
          classification: series.classification,
          releaseYear: series.releaseYear,
          episodes: series.episodes?.toString() ?? '',
          season: series.season?.toString() ?? '1',
          featured: series.featured ?? false,
        }}
        genres={moviesGenres.includes(series.genre) ? moviesGenres : [series.genre, ...moviesGenres]}
        classifications={
          classifications.includes(series.classification)
            ? classifications
            : [series.classification, ...classifications]
        }
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}