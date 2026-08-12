'use client';

import { useMutation, useQuery } from '@pelis/db/client';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, Star, Check, Zap, Rocket, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db';
import { Button, Spinner } from '@pelis/ui/components';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { cn } from '@pelis/ui/utils';

interface PlanRow {
  _id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  icon: string;
  months: number;
  recommended?: boolean;
  stripePriceId?: string;
  activeSubscribers: number;
  totalSubscribers: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Star,
  Rocket,
  Crown,
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function AdminPlansPage() {
  const plans = useQuery(api.adminPlans.adminList, {}) as PlanRow[] | undefined;
  const remove = useMutation(api.adminPlans.remove);
  const setRecommended = useMutation(api.adminPlans.setRecommended);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el plan "${name}"? Las suscripciones existentes no se borrarán.`)) return;
    setDeletingId(id);
    try {
      await remove({ id: id as any });
      toast.success('Plan eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleRecommended = async (plan: PlanRow) => {
    setBusyId(plan._id);
    try {
      await setRecommended({ id: plan._id as any, recommended: !plan.recommended });
      toast.success(plan.recommended ? 'Plan ya no es recomendado' : 'Plan marcado como recomendado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
            Planes
          </h1>
          <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
            {plans ? `${plans.length} planes configurados` : 'Cargando...'}
          </p>
        </div>
        <Link href="/admin/plans/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nuevo plan
          </Button>
        </Link>
      </div>

      {plans === undefined ? (
        <AdminTableSkeleton />
      ) : plans.length === 0 ? (
        <div className="text-center py-24 text-cinema-muted">
          No hay planes. Crea el primero.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const Icon = iconMap[plan.icon] ?? CreditCard;
            return (
              <article
                key={plan._id}
                className={cn(
                  'rounded-2xl border bg-cinema-surface p-5 flex flex-col gap-4',
                  plan.recommended ? 'border-cinema-gold/40 shadow-[0_0_0_1px_rgba(245,200,66,0.2)]' : 'border-cinema-border'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2.5 rounded-xl',
                        plan.recommended ? 'bg-cinema-gold/15 text-cinema-gold' : 'bg-cinema-violet/15 text-cinema-violet-light'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg uppercase tracking-wide text-white">{plan.name}</h3>
                      <p className="text-xs text-cinema-muted mt-0.5">{plan.months} mes{plan.months > 1 ? 'es' : ''}</p>
                    </div>
                  </div>
                  {plan.recommended && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cinema-gold/20 text-cinema-gold uppercase tracking-wider font-semibold">
                      Recomendado
                    </span>
                  )}
                </div>

                <p className="text-sm text-cinema-silver line-clamp-3">{plan.description}</p>

                <ul className="space-y-1.5">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-cinema-muted">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-cinema-violet-light shrink-0" />
                      <span className="line-clamp-1">{f}</span>
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-[10px] text-cinema-ash">+{plan.features.length - 4} más</li>
                  )}
                </ul>

                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <p className="text-2xl font-semibold text-white">{formatPrice(plan.price)}</p>
                    <p className="text-[10px] text-cinema-ash mt-0.5">
                      {plan.activeSubscribers} activos · {plan.totalSubscribers} totales
                    </p>
                  </div>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full', plan.stripePriceId ? 'bg-emerald-500/15 text-emerald-300' : 'bg-cinema-elevated text-cinema-muted')}>
                    {plan.stripePriceId ? 'Stripe OK' : 'Sin Stripe'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-cinema-border/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleRecommended(plan)}
                    disabled={busyId === plan._id}
                  >
                    <Star className={cn('w-4 h-4', plan.recommended && 'fill-cinema-gold text-cinema-gold')} />
                    <span className="ml-1">{plan.recommended ? 'Quitar' : 'Destacar'}</span>
                  </Button>
                  <div className="ml-auto flex gap-1">
                    <Link href={`/admin/plans/${plan._id}/edit`}>
                      <Button variant="ghost" size="sm" aria-label="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Eliminar"
                      disabled={deletingId === plan._id}
                      onClick={() => handleDelete(plan._id, plan.name)}
                    >
                      {deletingId === plan._id ? (
                        <Spinner className="w-4 h-4" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}