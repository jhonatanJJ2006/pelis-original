'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@pelis/ui/components';

export interface MovieFormValues {
  name: string;
  image: string;
  imageId?: string;
  synopsis: string;
  genre: string;
  token: string;
  actors: string;
  classification: string;
  releaseYear: string;
  videoUrl: string;
  mediaType: 'movie' | 'series';
  episodes: string;
  featured: boolean;
}

interface MovieFormProps {
  initialValues?: Partial<MovieFormValues>;
  genres: string[];
  classifications: string[];
  onSubmit: (values: MovieFormValues) => Promise<void>;
  onUploadImage?: (file: File) => Promise<{ image: string; imageId?: string }>;
  submitLabel?: string;
}

const defaultValues: MovieFormValues = {
  name: '',
  image: '',
  synopsis: '',
  genre: '',
  token: '',
  actors: '',
  classification: 'PG-13',
  releaseYear: new Date().getFullYear().toString(),
  videoUrl: '',
  mediaType: 'movie',
  episodes: '',
  featured: false,
};

export function MovieForm({
  initialValues,
  genres,
  classifications,
  onSubmit,
  onUploadImage,
  submitLabel = 'Guardar',
}: MovieFormProps) {
  const [values, setValues] = useState<MovieFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const setField = <K extends keyof MovieFormValues>(key: K, value: MovieFormValues[K]) => {
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
    if (!values.image.trim()) nextErrors.image = 'La imagen es requerida';
    if (values.synopsis.trim().length < 10) {
      nextErrors.synopsis = 'La sinopsis debe tener al menos 10 caracteres';
    }
    if (!values.genre.trim()) nextErrors.genre = 'El género es requerido';
    if (!values.token.trim()) nextErrors.token = 'El token es requerido';
    if (!values.actors.trim()) nextErrors.actors = 'Los actores son requeridos';
    if (!values.classification.trim()) {
      nextErrors.classification = 'La clasificación es requerida';
    }
    if (!/^\d{4}$/.test(values.releaseYear)) nextErrors.releaseYear = 'Año inválido';
    if (values.videoUrl && !/^https?:\/\//.test(values.videoUrl)) {
      nextErrors.videoUrl = 'URL de video inválida';
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;

    setIsUploading(true);
    try {
      const result = await onUploadImage(file);
      setField('image', result.image);
      if (result.imageId) setField('imageId', result.imageId);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="URL de imagen"
          value={values.image}
          onChange={(e) => setField('image', e.target.value)}
          error={errors.image}
        />
        {onUploadImage && (
          <div>
            <label className="block text-sm font-medium text-cinema-muted mb-1.5">
              Subir imagen
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="block w-full text-sm text-cinema-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cinema-elevated file:text-white hover:file:bg-cinema-elevated/80"
            />
          </div>
        )}
      </div>

      {values.image && (
        <div className="w-24 h-36 rounded-lg overflow-hidden bg-cinema-elevated border border-cinema-border">
          <img src={values.image} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <label htmlFor="synopsis" className="block text-sm font-medium text-cinema-muted mb-1.5">
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
        <Select
          label="Tipo"
          value={values.mediaType}
          onChange={(e) => setField('mediaType', e.target.value as 'movie' | 'series')}
        >
          <option value="movie">Película</option>
          <option value="series">Serie</option>
        </Select>
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

      <Input
        label="URL de video"
        value={values.videoUrl}
        onChange={(e) => setField('videoUrl', e.target.value)}
        error={errors.videoUrl}
        placeholder="https://..."
      />

      <label className="inline-flex items-center gap-2 text-sm text-cinema-muted cursor-pointer">
        <input
          type="checkbox"
          checked={values.featured}
          onChange={(e) => setField('featured', e.target.checked)}
          className="rounded border-cinema-border bg-cinema-surface text-cinema-accent focus:ring-cinema-accent/50"
        />
        Destacada en inicio
      </label>

      <Button type="submit" disabled={isSubmitting || isUploading}>
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  );
}
