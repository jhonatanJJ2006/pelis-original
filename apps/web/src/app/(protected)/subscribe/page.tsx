'use client';

import { useQuery, useAction } from '@pelis/db/client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import { Crown, Check, Zap, Star, Rocket, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { api } from '@pelis/db/api';
import { useUser } from '@pelis/auth/hooks';
import { SubscribePageSkeleton } from '@pelis/ui/features/subscribe-page-skeleton';
import { Button } from '@pelis/ui/components';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { toast } from 'sonner';
import { cn } from '@pelis/ui/utils';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

interface Plan {
  _id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  icon: string;
  months: number;
  recommended?: boolean;
  stripePriceId?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Star,
  Rocket,
  Crown,
};

type PlanAction = 'subscribe' | 'upgrade' | 'current' | 'lower' | 'unavailable';

function getPlanAction(
  plan: Plan,
  hasActivePlan: boolean,
  currentPlan: Plan | undefined
): PlanAction {
  if (!plan.stripePriceId) return 'unavailable';
  if (!hasActivePlan || !currentPlan) return 'subscribe';
  if (plan._id === currentPlan._id) return 'current';
  if (plan.price > currentPlan.price) return 'upgrade';
  return 'lower';
}

function planButtonLabel(action: PlanAction, isLoading: boolean): string {
  if (isLoading) {
    return action === 'upgrade' ? 'Abriendo pago...' : 'Redirigiendo...';
  }
  switch (action) {
    case 'current':
      return 'Plan actual';
    case 'upgrade':
      return 'Pagar mejora';
    case 'lower':
      return 'Plan inferior';
    case 'unavailable':
      return 'No disponible';
    default:
      return 'Suscribirse';
  }
}

export default function SubscribePage() {
  const { user } = useUser();
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const plans = (useQuery(api.subscriptions.list, {}) as Plan[] | undefined) ?? [];
  const createCheckoutSession = useAction<{ planId: string }, { url: string; upgraded: false }>(api.stripe.createCheckoutSession);
  const createPortalSession = useAction<Record<string, never>, { url: string }>(api.stripe.createPortalSession);

  const isLoading = plans === undefined;
  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());

  const sortedPlans = useMemo(() => [...plans].sort((a, b) => a.price - b.price), [plans]);

  const currentPlan = useMemo(
    () => sortedPlans.find((p) => p._id === user?.planId),
    [sortedPlans, user?.planId]
  );

  const handleSubscribe = async (plan: Plan, action: PlanAction) => {
    if (!user) {
      toast.error('Debes iniciar sesión para suscribirte');
      return;
    }

    if (action !== 'subscribe' && action !== 'upgrade') return;

    if (!plan.stripePriceId) {
      toast.error('Plan no configurado para pagos. Contacta al administrador.');
      return;
    }

    setLoadingPlanId(plan._id);
    try {
      const result = await createCheckoutSession({ planId: plan._id as any });
      if (result?.url) {
        // Upgrade siempre va a Stripe Checkout; el plan solo cambia tras pagar
        window.location.href = result.url;
      } else {
        toast.error('Error al crear la sesión de pago');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar el pago';
      toast.error(message);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const result = await createPortalSession({});
      if (result?.url) {
        window.location.href = result.url;
      } else {
        toast.error('Error al abrir el portal de facturación');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al abrir el portal';
      toast.error(message);
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="page-shell">
      <ScrollReveal className="text-center mb-14 max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-gradient-to-br from-cinema-gold to-cinema-gold-light rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_4px_24px_rgba(245,200,66,0.3)]">
          <Crown className="w-8 h-8 text-black" aria-hidden />
        </div>
        <p className="text-cinema-violet-light text-sm font-medium uppercase tracking-widest mb-2">
          Membresía
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-4">
          Elige tu plan
        </h1>
        <p className="text-cinema-muted text-lg">
          {hasActivePlan
            ? 'Puedes mejorar a un plan superior cuando quieras.'
            : 'Desliza los planes y elige el que mejor se adapte a ti.'}
        </p>
        {hasActivePlan && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-sm">
              <Check className="w-4 h-4" aria-hidden />
              {currentPlan ? (
                <>
                  Plan {currentPlan.name} activo hasta{' '}
                  {new Date(user!.planExpiresAt!).toLocaleDateString('es-ES')}
                </>
              ) : (
                <>
                  Suscripción activa hasta{' '}
                  {new Date(user!.planExpiresAt!).toLocaleDateString('es-ES')}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cinema-elevated border border-cinema-border text-cinema-silver hover:text-white rounded-full text-sm transition-colors disabled:opacity-50"
            >
              <Settings className="w-4 h-4" aria-hidden />
              {loadingPortal ? 'Abriendo...' : 'Gestionar suscripción'}
            </button>
          </div>
        )}
      </ScrollReveal>

      {isLoading ? (
        <SubscribePageSkeleton />
      ) : sortedPlans.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="Sin planes disponibles"
          description="Vuelve más tarde para ver nuestras membresías."
        />
      ) : (
        <div className="relative group/swiper max-w-5xl mx-auto overflow-visible">
          <button
            ref={prevRef}
            type="button"
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white hidden md:flex items-center justify-center opacity-0 group-hover/swiper:opacity-100 focus-visible:opacity-100"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            ref={nextRef}
            type="button"
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-white hidden md:flex items-center justify-center opacity-0 group-hover/swiper:opacity-100 focus-visible:opacity-100"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <Swiper
            modules={[Navigation, FreeMode]}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onInit={(swiper) => {
              if (swiper.params.navigation && typeof swiper.params.navigation === 'object') {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
                swiper.navigation.init();
                swiper.navigation.update();
              }
            }}
            freeMode={{ enabled: true, momentum: true }}
            slidesPerView="auto"
            spaceBetween={20}
            grabCursor
            centeredSlides={sortedPlans.length <= 3}
            breakpoints={{
              768: { centeredSlides: false },
            }}
            className="subscription-plans-swiper pb-4"
          >
            {sortedPlans.map((plan) => {
              const Icon = iconMap[plan.icon] || Star;
              const isPlanLoading = loadingPlanId === plan._id;
              const action = getPlanAction(plan, hasActivePlan, currentPlan);
              const canSelect = action === 'subscribe' || action === 'upgrade';
              const isCurrent = action === 'current';

              return (
                <SwiperSlide
                  key={plan._id}
                  className="!w-[280px] sm:!w-[300px] md:!w-[320px] h-auto"
                >
                  <div className="relative h-full pt-4">
                    {isCurrent ? (
                      <span className="absolute top-0 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-wide shadow-[0_2px_12px_rgba(16,185,129,0.4)]">
                        Tu plan
                      </span>
                    ) : plan.recommended ? (
                      <span className="absolute top-0 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap px-4 py-1 bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black text-xs font-bold rounded-full uppercase tracking-wide shadow-[0_2px_12px_rgba(245,200,66,0.4)]">
                        Recomendado
                      </span>
                    ) : null}

                    <div
                      className={cn(
                        'flex flex-col rounded-2xl border p-8 h-full overflow-visible motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-normal [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1',
                        isCurrent
                          ? 'bg-cinema-surface border-emerald-500/50 shadow-[0_8px_32px_rgba(16,185,129,0.15)]'
                          : plan.recommended
                            ? 'card-feature border-cinema-gold/40 shadow-[0_8px_32px_rgba(245,200,66,0.15)] [@media(hover:hover)_and_(pointer:fine)]:hover:border-cinema-gold/60 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_12px_40px_rgba(245,200,66,0.25)]'
                            : 'bg-cinema-surface border-cinema-border [@media(hover:hover)_and_(pointer:fine)]:hover:border-cinema-violet/40'
                      )}
                    >
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center mb-5',
                          isCurrent
                            ? 'bg-emerald-500 text-white'
                            : plan.recommended
                              ? 'bg-cinema-gold text-black'
                              : 'bg-gradient-to-br from-cinema-violet to-cinema-teal text-white'
                        )}
                      >
                        <Icon className="w-6 h-6" aria-hidden />
                      </div>
                      <h3 className="font-display text-2xl tracking-wide text-white uppercase mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-cinema-silver text-sm mb-5">{plan.description}</p>

                      <div className="mb-6">
                        <span className="text-4xl font-bold text-white">${plan.price}</span>
                        <span className="text-cinema-silver">
                          /{plan.months} {plan.months === 1 ? 'mes' : 'meses'}
                        </span>
                      </div>

                      <ul className="flex-1 space-y-3 mb-8">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check
                              className="w-4 h-4 text-cinema-teal mt-0.5 shrink-0"
                              aria-hidden
                            />
                            <span className="text-cinema-muted">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {action === 'unavailable' && (
                        <p className="text-xs text-amber-400/90 mb-3 text-center">
                          Plan no configurado para pagos
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSubscribe(plan, action)}
                        disabled={!canSelect || isPlanLoading}
                        className={cn(
                          'w-full py-3.5 rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                          action === 'upgrade'
                            ? 'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110'
                            : action === 'current'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : plan.recommended
                                ? 'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110'
                                : 'bg-cinema-elevated hover:bg-cinema-violet/30 text-white border border-cinema-border'
                        )}
                      >
                        {planButtonLabel(action, isPlanLoading)}
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      )}

      {!user && (
        <div className="text-center mt-10">
          <p className="text-cinema-muted mb-4">Necesitas una cuenta para suscribirte</p>
          <Link href="/login">
            <Button>Iniciar sesión</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
