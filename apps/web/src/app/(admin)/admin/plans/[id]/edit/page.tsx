'use client';

import { useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { AdminFormSkeleton } from '@pelis/ui/features/admin-form-skeleton';
import { PlanForm, type PlanFormValues } from '../../plan-form';

export default function EditPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const plan = useQuery<any>(api.adminPlans.getById, { id: id as any });
  const update = useMutation(api.adminPlans.update);

  const handleSubmit = async (values: PlanFormValues) => {
    try {
      const features = values.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await update({
        id: id as any,
        name: values.name.trim(),
        price: Number(values.price),
        description: values.description.trim(),
        features,
        icon: values.icon,
        months: Number(values.months),
        maxDevices: Number(values.maxDevices),
        recommended: values.recommended,
        stripePriceId: values.stripePriceId.trim() || undefined,
      });
      toast.success('Plan actualizado');
      router.push('/admin/plans');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  if (plan === undefined) {
    return <AdminFormSkeleton />;
  }

  if (!plan) {
    return (
      <div className="text-center py-24 text-cinema-muted">
        Plan no encontrado.{' '}
        <Link href="/admin/plans" className="text-cinema-violet-light hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/plans"
        className="inline-flex items-center gap-2 text-sm text-cinema-muted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase mb-6 sm:mb-8">
        Editar plan
      </h1>

      <PlanForm
        initialValues={{
          name: plan.name,
          price: plan.price.toString(),
          description: plan.description,
          featuresText: plan.features.join('\n'),
          icon: plan.icon,
          months: plan.months.toString(),
          maxDevices: String(plan.maxDevices ?? 1),
          recommended: plan.recommended ?? false,
          stripePriceId: plan.stripePriceId ?? '',
        }}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
