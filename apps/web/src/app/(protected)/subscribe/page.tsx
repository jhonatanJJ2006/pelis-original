'use client';

import { useQuery, useMutation } from 'convex/react';
import Link from 'next/link';
import { Crown, Check, Zap, Star, Rocket } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { Spinner, Button } from '@pelis/ui/components';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { toast } from 'sonner';
import { cn } from '@pelis/ui/utils';

interface Plan {
  _id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  icon: string;
  months: number;
  recommended?: boolean;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Zap, Star, Rocket, Crown,
};

export default function SubscribePage() {
  const { user } = useUser();
  const plans = (useQuery(api.subscriptions.list, {}) as Plan[] | undefined) ?? [];
  const subscribe = useMutation(api.subscriptions.subscribe);

  const isLoading = plans === undefined;

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para suscribirte');
      return;
    }
    try {
      await subscribe({ planId: planId as any });
      toast.success('¡Suscripción activada con éxito!');
    } catch {
      toast.error('Error al activar la suscripción');
    }
  };

  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());

  return (
    <div className="page-shell">
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-cinema-gold rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-cinema-gold/20">
          <Crown className="w-8 h-8 text-black" />
        </div>
        <p className="text-cinema-gold text-sm font-medium uppercase tracking-widest mb-2">
          Membresía
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-4">
          Elige tu plan
        </h1>
        <p className="text-zinc-400 text-lg">
          Contenido sin límites, sin anuncios, en cualquier dispositivo.
        </p>
        {hasActivePlan && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-sm">
            <Check className="w-4 h-4" />
            Suscripción activa hasta{' '}
            {new Date(user!.planExpiresAt!).toLocaleDateString('es-ES')}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="Sin planes disponibles"
          description="Vuelve más tarde para ver nuestras membresías."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const Icon = iconMap[plan.icon] || Star;
            return (
              <div
                key={plan._id}
                className={cn(
                  'relative bg-cinema-surface rounded-2xl border p-8 transition-all hover:-translate-y-1',
                  plan.recommended
                    ? 'border-cinema-gold/50 shadow-xl shadow-cinema-gold/10'
                    : 'border-cinema-border hover:border-cinema-accent/30'
                )}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-cinema-gold text-black text-xs font-bold rounded-full uppercase tracking-wide">
                    Recomendado
                  </div>
                )}

                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-5',
                    plan.recommended ? 'bg-cinema-gold' : 'bg-cinema-accent'
                  )}
                >
                  <Icon className={cn('w-6 h-6', plan.recommended ? 'text-black' : 'text-white')} />
                </div>
                <h3 className="font-display text-2xl tracking-wide text-white uppercase mb-1">
                  {plan.name}
                </h3>
                <p className="text-zinc-400 text-sm mb-5">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-zinc-400">
                    /{plan.months} {plan.months === 1 ? 'mes' : 'meses'}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(plan._id)}
                  disabled={hasActivePlan}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-semibold transition-all',
                    plan.recommended
                      ? 'bg-cinema-gold hover:bg-cinema-gold-light text-black'
                      : 'bg-cinema-elevated hover:bg-cinema-border text-white border border-cinema-border',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {hasActivePlan ? 'Ya tienes un plan' : 'Suscribirse'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!user && (
        <div className="text-center mt-10">
          <p className="text-zinc-400 mb-4">Necesitas una cuenta para suscribirte</p>
          <Link href="/login">
            <Button>Iniciar sesión</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
