'use client';

import { useMutation } from '@pelis/db/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { PlanForm, type PlanFormValues } from '../plan-form';

function buildArgs(values: PlanFormValues) {
  const features = values.featuresText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name: values.name.trim(),
    price: Number(values.price),
    description: values.description.trim(),
    features,
    icon: values.icon,
    months: Number(values.months),
    maxDevices: Number(values.maxDevices),
    recommended: values.recommended,
    stripePriceId: values.stripePriceId.trim() || undefined,
  };
}

export default function NewPlanPage() {
  const router = useRouter();
  const create = useMutation(api.adminPlans.create);

  const handleSubmit = async (values: PlanFormValues) => {
    try {
      await create(buildArgs(values));
      toast.success('Plan creado');
      router.push('/admin/plans');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear');
    }
  };

  return (
    <div>
      <Link
        href="/admin/plans"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-cinema-chalk mb-6 sm:mb-8">
        Nuevo plan
      </h1>

      <PlanForm onSubmit={handleSubmit} submitLabel="Crear plan" />
    </div>
  );
}
