'use client';

import { useQuery, useMutation } from 'convex/react';
import Link from 'next/link';
import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import { Crown, Check, Zap, Star, Rocket, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@pelis/convex';
import { useUser } from '@pelis/auth/hooks';
import { Spinner, Button } from '@pelis/ui/components';
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
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Star,
  Rocket,
  Crown,
};

export default function SubscribePage() {
  const { user } = useUser();
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
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
      toast.success('Suscripción activada con éxito');
    } catch {
      toast.error('Error al activar la suscripción');
    }
  };

  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());

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
          Desliza los planes y elige el que mejor se adapte a ti.
        </p>
        {hasActivePlan && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-sm">
            <Check className="w-4 h-4" aria-hidden />
            Suscripción activa hasta{' '}
            {new Date(user!.planExpiresAt!).toLocaleDateString('es-ES')}
          </div>
        )}
      </ScrollReveal>

      {isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Cargando">
          <Spinner size="lg" />
        </div>
      ) : plans.length === 0 ? (
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
            centeredSlides={plans.length <= 3}
            breakpoints={{
              768: { centeredSlides: false },
            }}
            className="subscription-plans-swiper pb-4"
          >
            {plans.map((plan) => {
              const Icon = iconMap[plan.icon] || Star;
              return (
                <SwiperSlide key={plan._id} className="!w-[280px] sm:!w-[300px] md:!w-[320px] h-auto">
                  <div className="relative h-full pt-4">
                    {plan.recommended && (
                      <span className="absolute top-0 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap px-4 py-1 bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black text-xs font-bold rounded-full uppercase tracking-wide shadow-[0_2px_12px_rgba(245,200,66,0.4)]">
                        Recomendado
                      </span>
                    )}

                    <div
                      className={cn(
                        'flex flex-col rounded-2xl border p-8 h-full overflow-visible motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-normal [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1',
                        plan.recommended
                          ? 'card-feature border-cinema-gold/40 shadow-[0_8px_32px_rgba(245,200,66,0.15)] [@media(hover:hover)_and_(pointer:fine)]:hover:border-cinema-gold/60 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_12px_40px_rgba(245,200,66,0.25)]'
                          : 'bg-cinema-surface border-cinema-border [@media(hover:hover)_and_(pointer:fine)]:hover:border-cinema-violet/40'
                      )}
                    >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center mb-5',
                        plan.recommended
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
                          <Check className="w-4 h-4 text-cinema-teal mt-0.5 shrink-0" aria-hidden />
                          <span className="text-cinema-muted">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan._id)}
                      disabled={hasActivePlan}
                      className={cn(
                        'w-full py-3.5 rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                        plan.recommended
                          ? 'bg-gradient-to-r from-cinema-gold to-cinema-gold-light text-black hover:brightness-110'
                          : 'bg-cinema-elevated hover:bg-cinema-violet/30 text-white border border-cinema-border'
                      )}
                    >
                      {hasActivePlan ? 'Ya tienes un plan' : 'Suscribirse'}
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
