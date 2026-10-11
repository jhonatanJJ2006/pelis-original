'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@pelis/ui/components';

export interface AnimeFormValues {
  title: string;
  alternativeTitle: string;
  image: string;
  synopsis: string;
  genreText: string;
  episodes: string;
  status: 'ongoing' | 'completed';
  year: string;
  rating: string;
  anilistId: string;
  malId: string;
  providersText: string;
}

interface AnimeFormProps {
  initialValues?: Partial<AnimeFormValues>;
  onSubmit: (values: AnimeFormValues) => Promise<void>;
  submitLabel?: string;
}

const defaultValues: AnimeFormValues = {
  title: '',
  alternativeTitle: '',
  image: '',
  synopsis: '',
  genreText: '',
  episodes: '',
  status: 'completed',
  year: new Date().getFullYear().toString(),
  rating: '',
  anilistId: '',
  malId: '',
  providersText: '',
};

export function AnimeForm({ initialValues, onSubmit, submitLabel = 'Guardar' }: AnimeFormProps) {
  const [values, setValues] = useState<AnimeFormValues>({ ...defaultValues, ...initialValues });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof AnimeFormValues>(key: K, value: AnimeFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.title.trim()) nextErrors.title = 'El título es requerido';
    if (!values.image.trim()) nextErrors.image = 'La imagen es requerida';
    if (values.synopsis.trim().length < 10) {
      nextErrors.synopsis = 'La sinopsis debe tener al menos 10 caracteres';
    }
    const epsNum = Number(values.episodes);
    if (!values.episodes || !Number.isFinite(epsNum) || epsNum < 1) {
      nextErrors.episodes = 'Episodios inválidos';
    }
    if (!/^\d{4}$/.test(values.year)) {
      nextErrors.year = 'Año inválido';
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
        <section className="rounded-lg border border-cinema-border bg-cinema-surface p-5 space-y-5">
          <h2 className="font-display text-lg font-semibold text-cinema-chalk">Datos del anime</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Título"
              value={values.title}
              onChange={(e) => setField('title', e.target.value)}
              error={errors.title}
            />
            <Input
              label="Título alternativo"
              value={values.alternativeTitle}
              onChange={(e) => setField('alternativeTitle', e.target.value)}
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

          <Input
            label="Géneros (separados por coma)"
            value={values.genreText}
            onChange={(e) => setField('genreText', e.target.value)}
            placeholder="Acción, Aventura, Drama"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Input
              label="Año"
              value={values.year}
              onChange={(e) => setField('year', e.target.value)}
              error={errors.year}
            />
            <Input
              label="Episodios"
              type="number"
              value={values.episodes}
              onChange={(e) => setField('episodes', e.target.value)}
              error={errors.episodes}
            />
            <Input
              label="Rating (0-10)"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={values.rating}
              onChange={(e) => setField('rating', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="AniList ID"
              type="number"
              value={values.anilistId}
              onChange={(e) => setField('anilistId', e.target.value)}
              placeholder="ej. 21 (One Piece)"
            />
            <Input
              label="MAL ID"
              type="number"
              value={values.malId}
              onChange={(e) => setField('malId', e.target.value)}
            />
          </div>

          <Select
            label="Estado"
            value={values.status}
            onChange={(e) => setField('status', e.target.value as 'ongoing' | 'completed')}
          >
            <option value="ongoing">En emisión</option>
            <option value="completed">Finalizado</option>
          </Select>

          <div>
            <label
              htmlFor="providers"
              className="block text-sm font-medium text-cinema-muted mb-1.5"
            >
              Proveedores (uno por línea: nombre | url | idioma)
            </label>
            <textarea
              id="providers"
              value={values.providersText}
              onChange={(e) => setField('providersText', e.target.value)}
              rows={4}
              placeholder={'GogoAnime | https://gogoanime.cl/search/attack-on-titan | sub'}
              className="input-field resize-y"
            />
          </div>
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6">
        <section className="rounded-lg border border-cinema-border bg-cinema-surface p-5 space-y-5">
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
            <div className="w-24 h-36 rounded-lg overflow-hidden bg-cinema-elevated border border-cinema-border">
              <img src={values.image} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </section>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </aside>
    </form>
  );
}
