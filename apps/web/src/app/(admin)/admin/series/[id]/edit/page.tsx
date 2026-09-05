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
import { SeriesForm, type SeriesFormValues } from '../../series-form';
import { EnrichSeriesModal } from '../../../components/enrich-series-modal';

export default function EditSeriesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [showEnrich, setShowEnrich] = useState(false);

  const series = useQuery<any>(api.adminSeries.getById, { id: id as any });
  const update = useMutation(api.adminSeries.update);

  const moviesGenres = (useQuery(api.movies.getGenres, {}) as string[] | undefined) ?? [];
  const classifications = (useQuery(api.movies.getClassifications, {}) as string[] | undefined) ?? [
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
          Editar serie
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
        genres={
          moviesGenres.includes(series.genre) ? moviesGenres : [series.genre, ...moviesGenres]
        }
        classifications={
          classifications.includes(series.classification)
            ? classifications
            : [series.classification, ...classifications]
        }
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />

      {showEnrich && (
        <EnrichSeriesModal
          series={{
            _id: series._id,
            name: series.name,
            image: series.image,
            backdropImage: series.backdropImage,
          }}
          onClose={() => setShowEnrich(false)}
          onEnriched={() => setShowEnrich(false)}
        />
      )}
    </div>
  );
}
