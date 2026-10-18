'use client';

import Link from 'next/link';
import {
  Film,
  Tv,
  Clapperboard,
  Radio,
  Crown,
  Play,
  Shield,
  Sparkles,
  ArrowRight,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { Button } from '@pelis/ui/components';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { cn } from '@pelis/ui/utils';

const pillars = [
  {
    icon: Film,
    title: 'Películas',
    body: 'Estrenos y clásicos en una sala oscura, con póster letterbox y reproducción continua.',
  },
  {
    icon: Tv,
    title: 'Series',
    body: 'Catálogo para maratonear. Retoma donde lo dejaste cuando tengas cuenta.',
  },
  {
    icon: Clapperboard,
    title: 'Anime',
    body: 'Temporadas y episodios con proveedores en cascada. Listo para el sofá o el móvil.',
  },
  {
    icon: Radio,
    title: 'TV en vivo',
    body: 'Canales IPTV curados. Enciende y listo, sin zapping eterno.',
  },
];

const perks = [
  {
    icon: Sparkles,
    title: 'Maison Noir',
    body: 'Diseño premium: tinta cálida, champagne gold y tipografía editorial. Nada de plantilla Netflix.',
  },
  {
    icon: Play,
    title: 'Ver al instante',
    body: 'Explora el catálogo libremente. El plan premium desbloquea el streaming completo.',
  },
  {
    icon: Shield,
    title: 'Tu cuenta, tu plan',
    body: 'Login seguro, perfil y suscripción con Stripe en modo prueba mientras afinamos producción.',
  },
];

const devices = [
  {
    icon: Monitor,
    title: 'Web',
    body: 'Desde cualquier navegador, en tu computadora o tablet.',
  },
  {
    icon: Smartphone,
    title: 'Android',
    body: 'Lleva tu catálogo contigo y continúa donde lo dejaste.',
  },
  {
    icon: Tv,
    title: 'Android TV',
    body: 'La experiencia de diez pies, pensada para el control remoto.',
  },
];

export function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(229,194,118,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 20%, rgba(212,184,150,0.08), transparent), radial-gradient(ellipse 40% 30% at 0% 80%, rgba(139,30,45,0.08), transparent)',
        }}
      />

      <section className="page-shell pt-10 pb-16 md:pt-20 md:pb-24">
        <ScrollReveal className="max-w-3xl">
          <p className="text-cinema-accent text-xs md:text-sm font-medium uppercase tracking-[0.2em] mb-4">
            Streaming · Maison Noir
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-cinema-chalk leading-[1.05] mb-6">
            Cine, series, anime y TV en vivo.
            <span className="block italic text-cinema-accent mt-2">Todo en un solo lugar.</span>
          </h1>
          <p className="text-cinema-muted text-lg md:text-xl max-w-2xl mb-10">
            Pelis reúne películas, series, anime y TV en vivo en una experiencia premium. Entra,
            explora el catálogo y suscríbete cuando quieras ver sin límites.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Comenzar ahora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2">
                Iniciar sesión
              </Button>
            </Link>
            <Link
              href="/movies"
              className="text-sm text-cinema-silver hover:text-cinema-chalk px-2"
            >
              Explorar catálogo
            </Link>
            <Link
              href="/inicio"
              className="text-sm text-cinema-accent hover:text-cinema-accent-light px-2"
            >
              Conoce todo lo que incluye
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <section className="page-shell pb-16 md:pb-20">
        <ScrollReveal>
          <h2 className="font-display text-2xl md:text-3xl text-cinema-chalk mb-2">
            Todo en un solo lugar
          </h2>
          <p className="text-cinema-muted mb-8 max-w-xl">
            Cuatro mundos. La misma sala. Elige por dónde empezar.
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 60}>
              <div
                className={cn(
                  'h-full rounded-lg border border-cinema-border bg-cinema-surface/60 p-5',
                  'hover:border-cinema-accent/40 hover:-translate-y-1 transition-all duration-normal ease-out-expo'
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-cinema-elevated border border-cinema-border flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-cinema-accent" />
                </div>
                <h3 className="font-display text-xl text-cinema-chalk mb-2">{item.title}</h3>
                <p className="text-sm text-cinema-muted leading-relaxed">{item.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="page-shell pb-16 md:pb-20">
        <div className="rounded-lg border border-cinema-border bg-cinema-elevated/40 p-6 md:p-10">
          <div className="grid md:grid-cols-3 gap-8">
            {perks.map((perk) => (
              <div key={perk.title}>
                <div className="flex items-center gap-2 mb-3">
                  <perk.icon className="w-5 h-5 text-cinema-accent" />
                  <h3 className="font-display text-lg text-cinema-chalk">{perk.title}</h3>
                </div>
                <p className="text-sm text-cinema-muted leading-relaxed">{perk.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell pb-16 md:pb-20">
        <ScrollReveal>
          <p className="text-cinema-accent text-xs font-medium uppercase tracking-[0.2em] mb-3">
            Dispositivos
          </p>
          <h2 className="font-display text-2xl md:text-3xl text-cinema-chalk mb-8">
            Tu sala, en cualquier pantalla
          </h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-cinema-border/60 border border-cinema-border/60">
          {devices.map((d) => (
            <div key={d.title} className="bg-cinema-bg p-6">
              <d.icon className="w-6 h-6 text-cinema-accent mb-4" />
              <h3 className="font-display text-xl text-cinema-chalk mb-2">{d.title}</h3>
              <p className="text-sm text-cinema-muted leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell pb-20 md:pb-28">
        <ScrollReveal className="rounded-lg border border-cinema-accent/30 bg-gradient-to-br from-cinema-surface via-cinema-elevated to-cinema-bg p-8 md:p-12 text-center">
          <Crown className="w-10 h-10 text-cinema-accent mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-4xl text-cinema-chalk mb-3">
            Premium cuando lo necesites
          </h2>
          <p className="text-cinema-muted max-w-xl mx-auto mb-8">
            Mira planes, prueba el checkout en modo test de Stripe y activa el streaming. Sin plan
            aún puedes recorrer el catálogo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/subscribe">
              <Button variant="gold" size="lg" className="gap-2">
                Ver planes
                <Crown className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary" size="lg">
                Empezar gratis
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
