'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@pelis/ui/components';

export interface ChannelFormValues {
  name: string;
  logo: string;
  category: string;
  country: string;
  language: string;
  streamUrl: string;
  source: string;
  tvgId: string;
  isActive: boolean;
  sortOrder: string;
}

interface ChannelFormProps {
  initialValues?: Partial<ChannelFormValues>;
  onSubmit: (values: ChannelFormValues) => Promise<void>;
  submitLabel?: string;
}

const defaultValues: ChannelFormValues = {
  name: '',
  logo: '',
  category: 'General',
  country: '',
  language: 'es',
  streamUrl: '',
  source: 'manual',
  tvgId: '',
  isActive: true,
  sortOrder: '1000',
};

const KNOWN_CATEGORIES = [
  'Fútbol',
  'Fórmula 1',
  'Lucha libre',
  'Deportes',
  'Infantil',
  'Anime',
  'Animación',
  'Noticias',
  'Entretenimiento',
  'Películas',
  'Series',
  'Documentales',
  'Música',
  'Cultura',
  'Religión',
  'Educación',
  'Legislatura',
  'Estilo de vida',
  'Viajes',
  'Cocina',
  'Clásicos',
  'General',
];

const KNOWN_COUNTRIES = [
  'Argentina',
  'Bolivia',
  'Brasil',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Cuba',
  'Ecuador',
  'El Salvador',
  'España',
  'Estados Unidos',
  'Guatemala',
  'Honduras',
  'México',
  'Nicaragua',
  'Panamá',
  'Paraguay',
  'Perú',
  'Puerto Rico',
  'República Dominicana',
  'Uruguay',
  'Venezuela',
];

const KNOWN_LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' },
];

export function ChannelForm({
  initialValues,
  onSubmit,
  submitLabel = 'Guardar',
}: ChannelFormProps) {
  const [values, setValues] = useState<ChannelFormValues>({ ...defaultValues, ...initialValues });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof ChannelFormValues>(key: K, value: ChannelFormValues[K]) => {
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
    if (!values.streamUrl.trim()) nextErrors.streamUrl = 'La URL del stream es requerida';
    if (!values.category.trim()) nextErrors.category = 'La categoría es requerida';
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
          <h2 className="font-display text-lg font-semibold text-cinema-chalk">Datos del canal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Nombre"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              error={errors.name}
            />
            <Input
              label="tvg-id (opcional)"
              value={values.tvgId}
              onChange={(e) => setField('tvgId', e.target.value)}
              placeholder="ej. antena3.es"
            />
          </div>

          <Input
            label="URL del stream (.m3u8 o http/https)"
            value={values.streamUrl}
            onChange={(e) => setField('streamUrl', e.target.value)}
            error={errors.streamUrl}
            placeholder="https://ejemplo.com/canal.m3u8"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select
              label="Categoría"
              value={values.category}
              onChange={(e) => setField('category', e.target.value)}
              error={errors.category}
            >
              <option value="">Seleccionar categoría</option>
              {KNOWN_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>

            <Select
              label="País"
              value={values.country}
              onChange={(e) => setField('country', e.target.value)}
            >
              <option value="">Sin país</option>
              {KNOWN_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Select
              label="Idioma"
              value={values.language}
              onChange={(e) => setField('language', e.target.value)}
            >
              {KNOWN_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
            <Input
              label="Fuente"
              value={values.source}
              onChange={(e) => setField('source', e.target.value)}
              placeholder="manual / m3u-playlist / iptv-org"
            />
            <Input
              label="Orden"
              type="number"
              value={values.sortOrder}
              onChange={(e) => setField('sortOrder', e.target.value)}
            />
          </div>
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6">
        <section className="rounded-lg border border-cinema-border bg-cinema-surface p-5 space-y-5">
          <h2 className="font-display text-lg font-semibold text-cinema-chalk">
            Logo y publicación
          </h2>
          <Input
            label="URL del logo"
            value={values.logo}
            onChange={(e) => setField('logo', e.target.value)}
            placeholder="https://..."
          />

          {values.logo && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-cinema-elevated border border-cinema-border flex items-center justify-center">
              <img src={values.logo} alt="Preview" className="w-12 h-12 object-contain" />
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-cinema-muted cursor-pointer">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
              className="rounded border-cinema-border bg-cinema-surface text-cinema-accent focus:ring-cinema-accent/50"
            />
            Canal activo
          </label>
        </section>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </aside>
    </form>
  );
}
