'use client';

import { useQuery, useMutation } from 'convex/react';
import Link from 'next/link';
import { Crown, Check, Zap, Star, Rocket } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { Spinner, Button } from '@pelis/ui/components';
import { toast } from 'sonner';

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
      toast.error('Debes iniciar sesi&oacute;n para suscribirte');
      return;
    }
    try {
      await subscribe({ planId: planId as any });
      toast.success('&iexcl;Suscripci&oacute;n activada con &eacute;xito!');
    } catch {
      toast.error('Error al activar la suscripci&oacute;n');
    }
  };

  const hasActivePlan = user?.planExpiresAt && user.planExpiresAt > Date.now();

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-3">Planes de suscripci&oacute;n</h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Elige el plan perfecto para ti y disfruta de todo nuestro contenido sin l&iacute;mites
        </p>
        {hasActivePlan && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-full text-sm">
            <Check className="w-4 h-4" />
            Tienes una suscripci&oacute;n activa hasta{' '}
            {new Date(user!.planExpiresAt!).toLocaleDateString('es-ES')}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20">
          <Crown className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No hay planes disponibles</h3>
          <p className="text-slate-400">Vuelve m&aacute;s tarde</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const Icon = iconMap[plan.icon] || Star;
            return (
              <div
                key={plan._id}
                className={`relative bg-dark-200 rounded-2xl border p-8 transition-all hover:scale-105 ${
                  plan.recommended
                    ? 'border-primary-500/50 shadow-lg shadow-primary-500/10'
                    : 'border-slate-800 hover:border-primary-500/30'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                    Recomendado
                  </div>
                )}

                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-slate-400">/{plan.months} {plan.months === 1 ? 'mes' : 'meses'}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan._id)}
                  disabled={hasActivePlan}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    plan.recommended
                      ? 'bg-primary-600 hover:bg-primary-500 text-white'
                      : 'bg-dark-100 hover:bg-dark-300 text-white border border-slate-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {hasActivePlan ? 'Ya tienes un plan' : 'Suscribirse'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!user && (
        <div className="text-center mt-8">
          <p className="text-slate-400 mb-4">Necesitas una cuenta para suscribirte</p>
          <Link href="/auth/login">
            <Button>Iniciar sesi&oacute;n</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
