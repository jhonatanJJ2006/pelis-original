'use client';

import { useMemo, useState } from 'react';
import { Button, Input, Select } from '@pelis/ui/components';
import {
  DEFAULT_PLAN_FEATURES_TEXT,
  PLAN_AUDIO_TRACKS,
  PLAN_FEATURE_PREFIX,
  PLAN_SUBTITLE_LANGS,
  PLAN_SUBTITLE_TYPES,
  parsePrefixedFeature,
  upsertPrefixedFeature,
} from '@/lib/plan-features';

export interface PlanFormValues {
  name: string;
  price: string;
  description: string;
  featuresText: string;
  icon: string;
  months: string;
  maxDevices: string;
  recommended: boolean;
  stripePriceId: string;
}

interface PlanFormProps {
  initialValues?: Partial<PlanFormValues>;
  onSubmit: (values: PlanFormValues) => Promise<void>;
  submitLabel?: string;
}

const defaultValues: PlanFormValues = {
  name: '',
  price: '0',
  description: '',
  featuresText: DEFAULT_PLAN_FEATURES_TEXT,
  icon: 'Zap',
  months: '1',
  maxDevices: '1',
  recommended: false,
  stripePriceId: '',
};

const ICONS = ['Zap', 'Star', 'Rocket', 'Crown'] as const;

export function PlanForm({ initialValues, onSubmit, submitLabel = 'Guardar' }: PlanFormProps) {
  const [values, setValues] = useState<PlanFormValues>({ ...defaultValues, ...initialValues });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) => {
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
    const price = Number(values.price);
    if (!values.price || !Number.isFinite(price) || price < 0) {
      nextErrors.price = 'Precio inválido';
    }
    if (values.description.trim().length < 5) {
      nextErrors.description = 'La descripción debe tener al menos 5 caracteres';
    }
    const months = Number(values.months);
    if (!values.months || !Number.isFinite(months) || months < 1) {
      nextErrors.months = 'Meses inválidos';
    }
    const maxDevices = Number(values.maxDevices);
    if (
      !values.maxDevices ||
      !Number.isFinite(maxDevices) ||
      maxDevices < 1 ||
      !Number.isInteger(maxDevices)
    ) {
      nextErrors.maxDevices = 'Dispositivos inválidos (mínimo 1)';
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

  const subtitleLangs = useMemo(
    () => parsePrefixedFeature(values.featuresText, PLAN_FEATURE_PREFIX.subtitles),
    [values.featuresText]
  );
  const subtitleTypes = useMemo(
    () => parsePrefixedFeature(values.featuresText, PLAN_FEATURE_PREFIX.types),
    [values.featuresText]
  );
  const audioTracks = useMemo(
    () => parsePrefixedFeature(values.featuresText, PLAN_FEATURE_PREFIX.audio),
    [values.featuresText]
  );

  const togglePrefixed = (prefix: string, option: string, selected: string[]) => {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    setField('featuresText', upsertPrefixedFeature(values.featuresText, prefix, next));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start"
    >
      <div className="space-y-5 min-w-0">
        <section className="rounded-lg border border-cinema-border bg-cinema-surface p-5 sm:p-6 space-y-5 shadow-xl shadow-black/20">
          <h2 className="font-display text-xl font-normal tracking-tight text-cinema-chalk">
            Datos del plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Nombre"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              error={errors.name}
            />
            <Input
              label="Precio (USD)"
              type="number"
              step="0.01"
              min="0"
              value={values.price}
              onChange={(e) => setField('price', e.target.value)}
              error={errors.price}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-cinema-muted mb-1.5"
            >
              Descripción
            </label>
            <textarea
              id="description"
              value={values.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              className="input-field resize-y"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="features"
              className="block text-sm font-medium text-cinema-muted mb-1.5"
            >
              Características (una por línea)
            </label>
            <textarea
              id="features"
              value={values.featuresText}
              onChange={(e) => setField('featuresText', e.target.value)}
              rows={6}
              placeholder={DEFAULT_PLAN_FEATURES_TEXT}
              className="input-field resize-y"
            />
            <p className="mt-1.5 text-xs text-cinema-muted">
              Las opciones de subtítulos y audio se guardan como líneas de características, por
              ejemplo «Subtítulos: Español, English».
            </p>
          </div>

          <fieldset className="rounded-[2px] border border-cinema-border bg-cinema-bg/40 p-4 space-y-4">
            <legend className="px-1 font-display text-sm tracking-wide text-cinema-chalk">
              Pistas de subtítulos y audio
            </legend>
            <p className="text-xs text-cinema-muted">
              Marca lo que incluye este plan. Se muestra en la página de suscripción. El reproductor
              sigue usando las pistas reales del stream.
            </p>

            <CheckboxGroup
              legend="Idiomas de subtítulos"
              options={PLAN_SUBTITLE_LANGS}
              selected={subtitleLangs}
              onToggle={(option) =>
                togglePrefixed(PLAN_FEATURE_PREFIX.subtitles, option, subtitleLangs)
              }
            />
            <CheckboxGroup
              legend="Tipos de subtítulos"
              options={PLAN_SUBTITLE_TYPES}
              selected={subtitleTypes}
              onToggle={(option) =>
                togglePrefixed(PLAN_FEATURE_PREFIX.types, option, subtitleTypes)
              }
            />
            <CheckboxGroup
              legend="Pistas de audio"
              options={PLAN_AUDIO_TRACKS}
              selected={audioTracks}
              onToggle={(option) => togglePrefixed(PLAN_FEATURE_PREFIX.audio, option, audioTracks)}
            />
          </fieldset>
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6">
        <section className="rounded-lg border border-cinema-border bg-cinema-surface p-5 sm:p-6 space-y-5 shadow-xl shadow-black/20">
          <h2 className="font-display text-xl font-normal tracking-tight text-cinema-chalk">
            Ajustes y publicación
          </h2>
          <div className="grid grid-cols-1 gap-5">
            <Select
              label="Ícono"
              value={values.icon}
              onChange={(e) => setField('icon', e.target.value)}
            >
              {ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </Select>
            <Input
              label="Duración (meses)"
              type="number"
              min="1"
              value={values.months}
              onChange={(e) => setField('months', e.target.value)}
              error={errors.months}
            />
            <Input
              label="Máx. dispositivos / sesiones"
              type="number"
              min="1"
              step="1"
              value={values.maxDevices}
              onChange={(e) => setField('maxDevices', e.target.value)}
              error={errors.maxDevices}
            />
            <Input
              label="Stripe Price ID"
              value={values.stripePriceId}
              onChange={(e) => setField('stripePriceId', e.target.value)}
              placeholder="price_..."
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-cinema-muted cursor-pointer">
            <input
              type="checkbox"
              checked={values.recommended}
              onChange={(e) => setField('recommended', e.target.checked)}
              className="rounded border-cinema-border bg-cinema-surface text-cinema-accent focus:ring-cinema-accent/50"
            />
            Marcar como recomendado
          </label>
        </section>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </aside>
    </form>
  );
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium tracking-widest text-cinema-muted">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                checked
                  ? 'border-cinema-accent/50 bg-cinema-accent/15 text-cinema-chalk'
                  : 'border-cinema-border bg-cinema-elevated text-cinema-muted hover:border-cinema-accent/40 hover:text-cinema-chalk'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                className="rounded border-cinema-border bg-cinema-surface text-cinema-accent focus:ring-cinema-accent/50"
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
