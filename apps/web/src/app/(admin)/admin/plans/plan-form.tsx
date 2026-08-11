'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@pelis/ui/components';

export interface PlanFormValues {
  name: string;
  price: string;
  description: string;
  featuresText: string;
  icon: string;
  months: string;
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
  featuresText: '',
  icon: 'Zap',
  months: '1',
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
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
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
        <label htmlFor="description" className="block text-sm font-medium text-cinema-muted mb-1.5">
          Descripción
        </label>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          rows={3}
          className="input-field resize-y"
        />
        {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
      </div>

      <div>
        <label htmlFor="features" className="block text-sm font-medium text-cinema-muted mb-1.5">
          Características (una por línea)
        </label>
        <textarea
          id="features"
          value={values.featuresText}
          onChange={(e) => setField('featuresText', e.target.value)}
          rows={5}
          placeholder={'Acceso completo\nSin anuncios\nCalidad HD'}
          className="input-field resize-y"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  );
}