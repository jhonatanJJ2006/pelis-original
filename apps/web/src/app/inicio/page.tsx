import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clapperboard,
  Film,
  Monitor,
  Radio,
  ShieldCheck,
  Smartphone,
  Tv,
} from 'lucide-react';
import { preloadQuery } from '@pelis/db/server';
import type { MediaItem } from '@pelis/ui/types';
import { cn } from '@pelis/ui/utils';
import { PRODUCTION_URL } from '@/lib/app-download';
import { PublicSiteHeader } from '@/components/public-site/public-site-header';
import { PublicSiteFooter } from '@/components/public-site/public-site-footer';
import { Faq, type FaqItem } from '@/components/public-site/faq';
import {
  buildPosterCollage,
  formatPlanPrice,
  isRenderableImage,
  pickPlans,
  type LandingPlan,
} from './lib/landing-data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Pelis — Cine, series, anime y canales en vivo',
  description:
    'Películas, series, anime y canales en vivo en un solo lugar. Mira Pelis en la web, en tu celular Android o en tu Android TV / Fire TV.',
  alternates: { canonical: `${PRODUCTION_URL}/inicio` },
  openGraph: {
    title: 'Pelis — Cine, series y anime sin límites',
    description:
      'Películas, series, anime y canales en vivo en un solo lugar. En la web, tu celular o tu TV.',
    url: `${PRODUCTION_URL}/inicio`,
    siteName: 'Pelis',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Pelis — Cine, series y anime sin límites' },
};

interface AnimeCard {
  title: string;
  image?: string | null;
  rating?: number | string | null;
}

interface TvListResult {
  items?: Array<{ name: string; logo?: string | null }>;
  total?: number;
}

interface CatalogPage {
  items?: MediaItem[];
  total?: number;
}

async function load<T>(name: string, args: unknown, fallback: T): Promise<T> {
  try {
    const req = new Request('http://localhost/inicio', { headers: new Headers() });
    const result = await preloadQuery<T>(name, args, req);
    return (result.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

const numberEs = new Intl.NumberFormat('es-ES');

function Poster({
  src,
  alt,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-[2px] bg-cinema-elevated', className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cinema-accent">
      {children}
    </p>
  );
}

export default async function InicioPage() {
  const [featured, trending, moviePage, seriesPage, anime, tv, plans] = await Promise.all([
    load<MediaItem[]>('movies.getFeatured', {}, []),
    load<MediaItem[]>('movies.getTrending', { limit: 18 }, []),
    load<CatalogPage>('movies.page', { mediaType: 'movie', limit: 1 }, {}),
    load<CatalogPage>('movies.page', { mediaType: 'series', limit: 18 }, {}),
    load<AnimeCard[]>('anime.listSeries', {}, []),
    load<TvListResult>('tv.list', {}, {}),
    load<LandingPlan[]>('subscriptions.list', {}, []),
  ]);

  const topAnime = [...anime]
    .filter((a) => isRenderableImage(a.image))
    .sort((x, y) => Number(y.rating ?? 0) - Number(x.rating ?? 0))
    .slice(0, 12);
  const collage = buildPosterCollage(
    [
      ...featured.map((m) => ({ src: m.image, alt: m.name })),
      ...trending.map((m) => ({ src: m.image, alt: m.name })),
      ...(seriesPage.items ?? []).map((m) => ({ src: m.image, alt: m.name })),
      ...topAnime.map((a) => ({ src: a.image ?? '', alt: a.title })),
    ],
    15
  );
  const columns = [0, 1, 2, 3, 4].map((c) => collage.filter((_, i) => i % 5 === c));

  const movieCover = featured[0] ?? trending[0];
  const series = seriesPage.items ?? [];
  const seriesCover = series.find((s) => s.backdropImage || s.image);
  const animeCover = topAnime[0];
  const liveCover = trending[1] ?? featured[1];
  const channelTotal = tv.total ?? tv.items?.length ?? 0;
  const landingPlans = pickPlans(plans);
  const cheapest = landingPlans[0];

  const stats = [
    { value: moviePage.total ?? 0, label: 'Películas' },
    { value: seriesPage.total ?? series.length, label: 'Series' },
    { value: anime.length, label: 'Títulos de anime' },
    { value: channelTotal, label: 'Canales en vivo' },
  ].filter((s) => s.value > 0);

  const included = [
    {
      title: 'Películas',
      eyebrow: 'Estrenos y clásicos',
      body: 'Acción, thriller, animación y cine de autor, listos para ver en tu pantalla.',
      href: '/movies',
      cta: 'Explorar películas',
      icon: Film,
      image: movieCover?.backdropImage || movieCover?.image,
    },
    {
      title: 'Series',
      eyebrow: 'Temporadas completas',
      body: 'Dramas, comedias y misterio para maratonear y retomar donde lo dejaste.',
      href: '/series',
      cta: 'Explorar series',
      icon: Tv,
      image: seriesCover?.backdropImage || seriesCover?.image,
    },
    {
      title: 'Anime',
      eyebrow: 'Subtitulado y doblado',
      body: 'Shōnen, seinen y clásicos por temporadas, con episodios ordenados.',
      href: '/anime',
      cta: 'Explorar anime',
      icon: Clapperboard,
      image: animeCover?.image ?? undefined,
    },
    {
      title: 'Canales en vivo',
      eyebrow: 'TV en directo 24/7',
      body: channelTotal
        ? `Más de ${numberEs.format(Math.floor(channelTotal / 10) * 10)} canales en vivo: noticias, deportes, cine y cultura.`
        : 'Noticias, deportes, cine y cultura en directo.',
      href: '/tv',
      cta: 'Ver canales',
      icon: Radio,
      image: liveCover?.backdropImage || liveCover?.image,
      live: true,
    },
  ];

  const devices = [
    {
      icon: Monitor,
      eyebrow: 'Cualquier navegador',
      title: 'Web',
      body: 'Entra a verpelis.pro desde tu computadora o tablet. Sin instalar nada.',
      points: ['Chrome, Edge, Safari y Firefox', 'Retoma donde lo dejaste'],
    },
    {
      icon: Smartphone,
      eyebrow: 'App Pelis para celular',
      title: 'Celular Android',
      body: 'Lleva el catálogo contigo con la app de Pelis para Android.',
      points: ['Android 6.0 o superior', 'Tu cuenta y tu lista, siempre contigo'],
    },
    {
      icon: Tv,
      eyebrow: 'App Pelis para TV',
      title: 'Android TV / Fire TV',
      body: 'Diseñada para el control remoto. Entra escaneando un QR con tu celular.',
      points: ['Navegación con las flechas del control', 'Inicio de sesión con QR o correo'],
    },
  ];

  const faq: FaqItem[] = [
    {
      q: '¿Qué es Pelis?',
      a: 'Pelis es un servicio de streaming en español con películas, series, anime y canales en vivo. Puedes explorar el catálogo libremente y, con un plan activo, verlo todo sin límites.',
    },
    {
      q: '¿Cuánto cuesta?',
      a: cheapest
        ? `Desde ${formatPlanPrice(cheapest)}. Hay ${landingPlans.length} planes: ${landingPlans
            .map((p) => `${p.name} (${formatPlanPrice(p)})`)
            .join(', ')}. Cambia de plan cuando quieras.`
        : 'Consulta los planes disponibles en la sección Planes.',
    },
    {
      q: '¿En qué dispositivos puedo ver?',
      a: 'En la web desde cualquier navegador, en celulares Android con la app Pelis y en Android TV / Fire TV con la app Pelis para TV. El número de pantallas a la vez depende de tu plan.',
    },
    {
      q: '¿Puedo cancelar cuando quiera?',
      a: 'Sí. No hay permanencia: cancelas tu suscripción desde tu perfil cuando quieras.',
    },
    {
      q: '¿Cómo instalo la app en mi TV?',
      a: 'En tu TV abre Downloader o el navegador, entra a verpelis.pro/descargas, descarga pelis-tv.apk e instálala. Luego abre Pelis y escanea el código QR con tu celular para entrar.',
      webOnly: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0e0e10] text-cinema-chalk">
      <PublicSiteHeader active="inicio" />

      <main>
        {/* Hero con collage de pósters reales del catálogo */}
        <section className="relative isolate overflow-hidden border-b border-cinema-border/50">
          <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -bottom-[12%] -top-[12%] left-[-10%] right-[-10%] flex rotate-[-8deg] gap-3 md:left-[40%] md:right-[-8%] md:gap-4">
              {columns.map((column, ci) => (
                <div
                  key={ci}
                  className={cn(
                    'flex flex-1 flex-col gap-3 md:gap-4',
                    ci % 2 === 1 && 'mt-16 md:mt-24'
                  )}
                >
                  {column.map((poster) => (
                    <Poster
                      key={poster.src}
                      src={poster.src}
                      alt=""
                      sizes="(max-width: 768px) 30vw, 14vw"
                      className="aspect-[2/3] w-full opacity-60"
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e10]/75 via-[#0e0e10]/85 to-[#0e0e10] md:bg-gradient-to-r md:from-[#0e0e10] md:from-[38%] md:via-[#0e0e10]/75 md:via-[58%] md:to-[#0e0e10]/35" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0e0e10] to-transparent" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0e0e10] to-transparent" />
          </div>

          <div className="mx-auto max-w-7xl px-5 pb-14 pt-16 md:px-10 md:pb-24 md:pt-28">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-cinema-accent/40 bg-[#0e0e10]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cinema-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
                Streaming en español
              </p>
              <h1 className="mt-6 font-display text-[2.75rem] leading-[1.05] tracking-tight text-cinema-chalk sm:text-6xl md:text-7xl">
                Cine, series y anime <em className="text-cinema-accent">sin límites.</em>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-cinema-muted md:text-lg">
                Películas, series, anime y canales en vivo en un solo lugar. Mira en la web, tu
                celular Android o tu TV.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-cinema-accent px-7 py-4 text-sm font-semibold tracking-[0.14em] text-[#3f2e00] transition-colors hover:bg-cinema-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e10]"
                >
                  Empieza ahora <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-[2px] border border-cinema-chalk/40 bg-[#0e0e10]/50 px-7 py-4 text-sm font-semibold tracking-[0.14em] text-cinema-chalk transition-colors hover:border-cinema-accent hover:text-cinema-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60"
                >
                  Iniciar sesión
                </Link>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-cinema-silver">
                <ShieldCheck className="h-4 w-4 text-cinema-accent" aria-hidden />
                Cancela cuando quieras. Sin permanencia.
              </p>
              {stats.length > 0 ? (
                <dl className="mt-10 grid max-w-xl grid-cols-2 gap-6 border-t border-cinema-border/70 pt-8 sm:grid-cols-4">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dt className="sr-only">{s.label}</dt>
                      <dd className="font-display text-3xl text-cinema-accent">
                        {numberEs.format(s.value)}
                      </dd>
                      <dd className="mt-1 text-[10px] uppercase tracking-[0.18em] text-cinema-silver">
                        {s.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </div>
        </section>

        {/* Todo lo que incluye */}
        <section
          id="incluye"
          className="scroll-mt-20 mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24"
        >
          <div className="text-center">
            <SectionEyebrow>Catálogo completo</SectionEyebrow>
            <h2 className="mt-3 font-display text-3xl text-cinema-chalk md:text-5xl">
              Todo lo que incluye
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cinema-silver md:text-base">
              Una sola cuenta para cuatro mundos: cine, series, anime y televisión en directo.
            </p>
          </div>
          <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
            {included.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group relative flex min-h-[340px] w-[78%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[2px] border border-cinema-border/80 bg-cinema-surface md:w-auto"
                >
                  {isRenderableImage(item.image) ? (
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 80vw, 25vw"
                      className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/70 to-transparent" />
                  {item.live ? (
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-[2px] bg-cinema-danger px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cinema-chalk">
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-cinema-chalk"
                        aria-hidden
                      />
                      En vivo
                    </span>
                  ) : null}
                  <div className="relative p-5">
                    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cinema-accent">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-2 font-display text-3xl text-cinema-chalk">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-cinema-muted">{item.body}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cinema-accent">
                      {item.cta}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Dispositivos */}
        <section
          id="dispositivos"
          className="scroll-mt-20 border-y border-cinema-border/50 bg-cinema-bg"
        >
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionEyebrow>Web, celular y TV</SectionEyebrow>
                <h2 className="mt-3 font-display text-3xl text-cinema-chalk md:text-5xl">
                  Míralo donde quieras
                </h2>
              </div>
              <Link
                href="/descargas"
                className="web-only inline-flex items-center gap-2 text-sm font-semibold text-cinema-accent hover:text-cinema-accent-light"
              >
                Ver descargas <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {devices.map((device) => {
                const Icon = device.icon;
                return (
                  <article
                    key={device.title}
                    className="rounded-[2px] border border-cinema-border/80 bg-cinema-surface p-6 md:p-7"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-cinema-accent/30 bg-cinema-accent/10">
                      <Icon className="h-5 w-5 text-cinema-accent" aria-hidden />
                    </span>
                    <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-cinema-silver">
                      {device.eyebrow}
                    </p>
                    <h3 className="mt-2 font-display text-2xl text-cinema-chalk">{device.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-cinema-muted">{device.body}</p>
                    <ul className="mt-5 space-y-2 border-t border-cinema-border/70 pt-5">
                      {device.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-2 text-sm text-cinema-silver"
                        >
                          <Check className="h-4 w-4 text-cinema-accent" aria-hidden />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
            <div className="web-only mt-6 flex flex-col gap-4 rounded-[2px] border border-cinema-accent/40 bg-cinema-accent/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
              <div>
                <p className="font-display text-lg text-cinema-chalk">
                  ¿Quieres la app en tu celular o en tu TV?
                </p>
                <p className="mt-1 text-sm text-cinema-silver">
                  Descarga Pelis para Android y para Android TV / Fire TV, con QR y pasos de
                  instalación.
                </p>
              </div>
              <Link
                href="/descargas"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[2px] border border-cinema-accent px-5 py-3 text-xs font-semibold tracking-[0.14em] text-cinema-accent transition-colors hover:bg-cinema-accent hover:text-[#3f2e00]"
              >
                Ver descargas <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Planes */}
        {landingPlans.length > 0 ? (
          <section
            id="planes"
            className="scroll-mt-20 mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24"
          >
            <div className="text-center">
              <SectionEyebrow>Planes</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl text-cinema-chalk md:text-5xl">
                Elige tu plan
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cinema-silver md:text-base">
                Todo el catálogo en cada plan. Cambia o cancela cuando quieras desde tu perfil.
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3 md:items-stretch">
              {landingPlans.map((plan) => (
                <article
                  key={plan._id}
                  className={cn(
                    'relative flex flex-col rounded-[2px] border bg-cinema-surface p-6 md:p-8',
                    plan.recommended
                      ? 'border-cinema-accent shadow-[0_0_60px_-20px_rgba(229,194,118,0.45)]'
                      : 'border-cinema-border/80'
                  )}
                >
                  {plan.recommended ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[2px] bg-cinema-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3f2e00]">
                      Recomendado
                    </span>
                  ) : null}
                  <h3 className="font-display text-2xl text-cinema-chalk">{plan.name}</h3>
                  {plan.description ? (
                    <p className="mt-1 text-sm text-cinema-silver">{plan.description}</p>
                  ) : null}
                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-5xl text-cinema-accent">
                      ${plan.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-cinema-silver">
                      {plan.months > 1 ? `/ ${plan.months} meses` : '/ mes'}
                    </span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3 border-t border-cinema-border/70 pt-6">
                    {plan.features.slice(0, 5).map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-cinema-muted"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-cinema-accent" aria-hidden />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/subscribe"
                    className={cn(
                      'mt-8 inline-flex items-center justify-center rounded-[2px] px-5 py-3 text-xs font-semibold tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60',
                      plan.recommended
                        ? 'bg-cinema-accent text-[#3f2e00] hover:bg-cinema-accent-light'
                        : 'border border-cinema-border text-cinema-chalk hover:border-cinema-accent hover:text-cinema-accent'
                    )}
                  >
                    Elegir {plan.name}
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-8 text-center">
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 text-sm font-semibold text-cinema-accent hover:text-cinema-accent-light"
              >
                Ver todos los detalles de los planes <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </p>
          </section>
        ) : null}

        {/* Preguntas frecuentes */}
        <section
          id="preguntas"
          className="scroll-mt-20 border-t border-cinema-border/50 bg-cinema-bg"
        >
          <div className="mx-auto max-w-4xl px-5 py-16 md:py-24">
            <div className="text-center">
              <SectionEyebrow>Dudas comunes</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl text-cinema-chalk md:text-5xl">
                Preguntas frecuentes
              </h2>
            </div>
            <Faq items={faq} className="mt-10" />
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden border-t border-cinema-border/50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 50% 70% at 50% 100%, rgba(229,194,118,0.12), transparent 70%)',
            }}
          />
          <div className="relative mx-auto max-w-3xl px-5 py-20 text-center md:py-28">
            <SectionEyebrow>Tu sala te espera</SectionEyebrow>
            <h2 className="mt-4 font-display text-4xl text-cinema-chalk md:text-6xl">
              La gran pantalla, <em className="text-cinema-accent">en tu casa.</em>
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-cinema-accent px-7 py-4 text-sm font-semibold tracking-[0.14em] text-[#3f2e00] transition-colors hover:bg-cinema-accent-light"
              >
                Empieza ahora <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-[2px] border border-cinema-chalk/40 px-7 py-4 text-sm font-semibold tracking-[0.14em] text-cinema-chalk transition-colors hover:border-cinema-accent hover:text-cinema-accent"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
