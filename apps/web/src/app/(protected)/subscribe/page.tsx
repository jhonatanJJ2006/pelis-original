'use client';

import { useQueryResult, useAction } from '@pelis/db/client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import {
  Crown,
  Check,
  Zap,
  Star,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Settings,
  Subtitles,
} from 'lucide-react';
import { api } from '@pelis/db/api';
import { useUser } from '@pelis/auth/hooks';
import { SubscribePageSkeleton } from '@pelis/ui/features/subscribe-page-skeleton';
import { Button } from '@pelis/ui/components';
import { EmptyState, ErrorState } from '@pelis/ui/features/empty-state';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { toast } from 'sonner';
import { cn } from '@pelis/ui/utils';
import { isPlanMediaFeature, parsePlanMediaFeatures } from '@/lib/plan-features';

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
  const {
    data: plansData,
    error: plansError,
    isLoading,
    refetch,
  } = useQueryResult<Plan[]>(api.subscriptions.list, {});
  const plans = plansData ?? [];
  const createCheckoutSession = useAction<{ planId: string }, { url: string; upgraded: false }>(
    api.stripe.createCheckoutSession
  );
  const createPortalSession = useAction<Record<string, never>, { url: string }>(
    api.stripe.createPortalSession
  );

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
        <div className="w-16 h-16 bg-gradient-to-br from-cinema-accent to-cinema-accent-light rounded-lg flex items-center justify-center mx-auto mb-5 shadow-[0_4px_24px_rgba(245,200,66,0.3)]">
          <Crown className="w-8 h-8 text-cinema-bg" aria-hidden />
        </div>
        <p className="text-cinema-accent-light text-sm font-medium uppercase tracking-widest mb-2">
          Membresía
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-cinema-chalk mb-4">
          Elige tu plan
        </h1>
        <p className="text-cinema-muted text-lg">
          {hasActivePlan
            ? 'Puedes mejorar a un plan superior cuando quieras.'
            : 'Desliza los planes y elige el que mejor se adapte a ti.'}
        </p>
        {hasActivePlan && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cinema-success/10 border border-cinema-success/30 text-cinema-success rounded-full text-sm">
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-cinema-elevated border border-cinema-border text-cinema-silver hover:text-cinema-chalk rounded-full text-sm transition-colors disabled:opacity-50"
            >
              <Settings className="w-4 h-4" aria-hidden />
              {loadingPortal ? 'Abriendo...' : 'Gestionar suscripción'}
            </button>
          </div>
        )}
      </ScrollReveal>

      {isLoading ? (
        <SubscribePageSkeleton />
      ) : plansError && !plansData ? (
        <ErrorState
          title="No se pudieron cargar los planes"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={refetch}
        />
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
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-cinema-chalk hidden md:flex items-center justify-center opacity-0 group-hover/swiper:opacity-100 focus-visible:opacity-100"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            ref={nextRef}
            type="button"
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-cinema-elevated/95 border border-cinema-border text-cinema-chalk hidden md:flex items-center justify-center opacity-0 group-hover/swiper:opacity-100 focus-visible:opacity-100"
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
                      <span className="absolute top-0 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-cinema-success text-cinema-bg text-label font-semibold rounded-full uppercase">
                        Tu plan
                      </span>
                    ) : plan.recommended ? (
                      <span className="absolute top-0 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap px-3 py-1 border border-cinema-accent bg-cinema-bg text-cinema-accent text-label font-semibold rounded-full uppercase">
                        Recomendado PELIS
                      </span>
                    ) : null}

                    <div
                      className={cn(
                        'flex flex-col rounded-lg border p-7 h-full overflow-visible motion-safe:transition-[border-color] motion-safe:duration-normal',
                        isCurrent
                          ? 'bg-cinema-surface border-2 border-cinema-success/60'
                          : plan.recommended
                            ? 'bg-cinema-elevated border-2 border-cinema-accent'
                            : 'bg-cinema-surface border-cinema-border [@media(hover:hover)_and_(pointer:fine)]:hover:border-cinema-accent/40'
                      )}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-[6px] flex items-center justify-center mb-5',
                          isCurrent
                            ? 'bg-cinema-success text-cinema-chalk'
                            : plan.recommended
                              ? 'bg-cinema-accent text-cinema-bg'
                              : 'border border-cinema-border text-cinema-accent'
                        )}
                      >
                        <Icon className="w-6 h-6" aria-hidden />
                      </div>
                      <h3 className="font-display text-2xl font-semibold tracking-tight text-cinema-chalk mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-cinema-silver text-sm mb-5">{plan.description}</p>

                      <div className="mb-6">
                        <span
                          className={cn(
                            'font-display text-4xl font-semibold',
                            plan.recommended ? 'text-cinema-accent' : 'text-cinema-chalk'
                          )}
                        >
                          ${plan.price}
                        </span>
                        <span className="text-cinema-silver">
                          /{plan.months} {plan.months === 1 ? 'mes' : 'meses'}
                        </span>
                      </div>

                      <ul className="flex-1 space-y-3 mb-5">
                        {plan.features
                          .filter((feature) => !isPlanMediaFeature(feature))
                          .map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check
                                className="w-4 h-4 text-cinema-accent mt-0.5 shrink-0"
                                aria-hidden
                              />
                              <span className="text-cinema-muted">{feature}</span>
                            </li>
                          ))}
                      </ul>
                      <PlanMediaCapabilities features={plan.features} />

                      {action === 'unavailable' && (
                        <p className="text-xs text-cinema-accent mb-3 text-center">
                          Plan no configurado para pagos
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSubscribe(plan, action)}
                        disabled={!canSelect || isPlanLoading}
                        className={cn(
                          'w-full h-11 rounded-[6px] text-xs font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                          action === 'upgrade'
                            ? 'bg-cinema-accent text-cinema-bg hover:bg-cinema-accent-light'
                            : action === 'current'
                              ? 'bg-cinema-success/20 text-cinema-success border border-cinema-success/40'
                              : plan.recommended
                                ? 'bg-cinema-accent text-cinema-bg hover:bg-cinema-accent-light'
                                : 'bg-transparent hover:bg-cinema-elevated text-cinema-chalk border border-cinema-border'
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

      <p className="text-center text-cinema-ash text-xs mt-12 leading-relaxed max-w-xl mx-auto">
        Al suscribirte aceptas los{' '}
        <Link
          href="/terminos"
          className="text-cinema-accent hover:text-cinema-accent-light underline"
        >
          Términos de uso
        </Link>{' '}
        y la{' '}
        <Link
          href="/privacidad"
          className="text-cinema-accent hover:text-cinema-accent-light underline"
        >
          Política de privacidad
        </Link>
        . Los pagos los procesa Stripe.
      </p>
    </div>
  );
}

function PlanMediaCapabilities({ features }: { features: string[] }) {
  const groups = parsePlanMediaFeatures(features);
  if (groups.length === 0) return null;

  return (
    <div className="mb-8 rounded-[10px] border border-cinema-accent/25 bg-cinema-bg/50 p-3">
      <p className="mb-2.5 flex items-center gap-1.5 font-display text-xs uppercase tracking-widest text-cinema-accent">
        <Subtitles className="h-3.5 w-3.5" aria-hidden />
        Audio y subtítulos
      </p>
      <ul className="space-y-2.5">
        {groups.map((group) => (
          <li key={group.key}>
            <p className="mb-1.5 text-[11px] text-cinema-muted">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.values.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-cinema-accent/30 bg-cinema-accent/10 px-2 py-0.5 text-[11px] text-cinema-chalk"
                >
                  {value}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
