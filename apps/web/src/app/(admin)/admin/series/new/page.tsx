'use client';

import { useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { SeriesForm, type SeriesFormValues } from '../series-form';

export default function NewSeriesPage() {
  const router = useRouter();
  const create = useMutation(api.adminSeries.create);

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
      await create({
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
      toast.success('Serie creada');
      router.push('/admin/series');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear');
    }
  };

  return (
    <div>
      <Link
        href="/admin/series"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-cinema-chalk transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-cinema-chalk mb-6 sm:mb-8">
        Nueva serie
      </h1>

      <SeriesForm
        genres={moviesGenres}
        classifications={classifications}
        onSubmit={handleSubmit}
        submitLabel="Crear serie"
      />
    </div>
  );
}
