'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@pelis/ui/components';

export interface SeriesFormValues {
  name: string;
  image: string;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
  episodes: string;
  season: string;
  featured: boolean;
}

interface SeriesFormProps {
  initialValues?: Partial<SeriesFormValues>;
  genres: string[];
  classifications: string[];
  onSubmit: (values: SeriesFormValues) => Promise<void>;
  submitLabel?: string;
}

const defaultValues: SeriesFormValues = {
  name: '',
  image: '',
  synopsis: '',
  genre: '',
  token: '',
  actors: '',
  classification: 'PG-13',
  releaseYear: new Date().getFullYear().toString(),
  episodes: '',
  season: '1',
  featured: false,
};

export function SeriesForm({
  initialValues,
  genres,
  classifications,
  onSubmit,
  submitLabel = 'Guardar',
}: SeriesFormProps) {
  const [values, setValues] = useState<SeriesFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof SeriesFormValues>(key: K, value: SeriesFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = 'El nombre es requerido';
    if (!values.token.trim()) nextErrors.token = 'El token es requerido';
    if (!values.image.trim()) nextErrors.image = 'La imagen es requerida';
    if (values.synopsis.trim().length < 10) {
      nextErrors.synopsis = 'La sinopsis debe tener al menos 10 caracteres';
    }
    if (!values.genre.trim()) nextErrors.genre = 'El género es requerido';
    if (!values.actors.trim()) nextErrors.actors = 'Los actores son requeridos';
    if (!values.classification.trim()) {
      nextErrors.classification = 'La clasificación es requerida';
    }
    if (!/^\d{4}$/.test(values.releaseYear)) {
      nextErrors.releaseYear = 'Año inválido';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start"
    >
      <div className="space-y-5 min-w-0">
        <section className="rounded-[2px] border border-cinema-border bg-cinema-surface p-5 space-y-5">
          <h2 className="font-display text-lg font-semibold text-cinema-chalk">
            Datos de la serie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Nombre"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              error={errors.name}
            />
            <Input
              label="Token"
              value={values.token}
              onChange={(e) => setField('token', e.target.value)}
              error={errors.token}
            />
          </div>

          <div>
            <label
              htmlFor="synopsis"
              className="block text-sm font-medium text-cinema-muted mb-1.5"
            >
              Sinopsis
            </label>
            <textarea
              id="synopsis"
              value={values.synopsis}
              onChange={(e) => setField('synopsis', e.target.value)}
              rows={4}
              className="input-field resize-y min-h-[120px]"
            />
            {errors.synopsis && <p className="mt-1 text-sm text-red-400">{errors.synopsis}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select
              label="Género"
              value={values.genre}
              onChange={(e) => setField('genre', e.target.value)}
              error={errors.genre}
            >
              <option value="">Seleccionar género</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </Select>

            <Select
              label="Clasificación"
              value={values.classification}
              onChange={(e) => setField('classification', e.target.value)}
              error={errors.classification}
            >
              {classifications.map((classification) => (
                <option key={classification} value={classification}>
                  {classification}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Input
              label="Año"
              value={values.releaseYear}
              onChange={(e) => setField('releaseYear', e.target.value)}
              error={errors.releaseYear}
            />
            <Input
              label="Temporada"
              type="number"
              value={values.season}
              onChange={(e) => setField('season', e.target.value)}
            />
            <Input
              label="Episodios"
              type="number"
              value={values.episodes}
              onChange={(e) => setField('episodes', e.target.value)}
            />
          </div>

          <Input
            label="Actores"
            value={values.actors}
            onChange={(e) => setField('actors', e.target.value)}
            error={errors.actors}
          />
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6">
        <section className="rounded-[2px] border border-cinema-border bg-cinema-surface p-5 space-y-5">
          <h2 className="font-display text-lg font-semibold text-cinema-chalk">
            Imagen y publicación
          </h2>
          <Input
            label="URL de imagen"
            value={values.image}
            onChange={(e) => setField('image', e.target.value)}
            error={errors.image}
          />

          {values.image && (
            <div className="w-24 h-36 rounded-[2px] overflow-hidden bg-cinema-elevated border border-cinema-border">
              <img src={values.image} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-cinema-muted cursor-pointer">
            <input
              type="checkbox"
              checked={values.featured}
              onChange={(e) => setField('featured', e.target.checked)}
              className="rounded border-cinema-border bg-cinema-surface text-cinema-accent focus:ring-cinema-accent/50"
            />
            Destacada en inicio
          </label>
        </section>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </aside>
    </form>
  );
}
