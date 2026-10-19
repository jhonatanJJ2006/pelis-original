import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Download, Info, ShieldCheck, Smartphone, Tv } from 'lucide-react';
import {
  APK_DOWNLOAD_PATH,
  APK_DOWNLOAD_URL,
  PRODUCTION_URL,
  TV_APK_DOWNLOAD_PATH,
  TV_APK_DOWNLOAD_URL,
} from '@/lib/app-download';
import { formatMegabytes, readAppAvailability } from '@/lib/app-availability';
import { isPelisAppUserAgent } from '@/lib/in-app-user-agent';
import { downloadQrDataUrl } from '@/lib/download-qr';
import { PublicSiteHeader } from '@/components/public-site/public-site-header';
import { PublicSiteFooter } from '@/components/public-site/public-site-footer';
import { Faq, type FaqItem } from '@/components/public-site/faq';

/** Versión y tamaño se leen del disco en cada visita (cambian al publicar un APK). */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Descargas — Pelis para celular y TV',
  description:
    'Descarga Pelis para tu celular Android y para Android TV / Fire TV. Versión, tamaño, código QR y pasos de instalación.',
  alternates: { canonical: `${PRODUCTION_URL}/descargas` },
  openGraph: {
    title: 'Descarga Pelis — celular y TV',
    description: 'Instala Pelis en tu celular Android o en tu Android TV / Fire TV.',
    url: `${PRODUCTION_URL}/descargas`,
    siteName: 'Pelis',
    locale: 'es_ES',
    type: 'website',
  },
};

interface DownloadCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon: typeof Smartphone;
  fileName: string;
  href: string;
  label: string;
  available: boolean;
  versionName: string | null;
  size: string | null;
  qr: string | null;
  qrCaption: string;
  qrHint: string;
  steps: string[];
}

function DownloadCard(props: DownloadCardProps) {
  const Icon = props.icon;
  const meta = [props.versionName ? `Versión ${props.versionName}` : null, props.size].filter(
    Boolean
  );
  return (
    <article className="flex flex-col rounded-[2px] border border-cinema-border/80 bg-cinema-surface/90 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cinema-accent">
            {props.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-3xl text-cinema-chalk md:text-[2.1rem]">
            {props.title}
          </h2>
          {props.subtitle ? (
            <p className="mt-1 text-sm text-cinema-silver">{props.subtitle}</p>
          ) : null}
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-cinema-border bg-cinema-elevated">
          <Icon className="h-5 w-5 text-cinema-accent" aria-hidden />
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[2px] border border-cinema-border/70 bg-[#0e0e10] px-4 py-3 text-sm">
        <span className="font-mono text-cinema-chalk">{props.fileName}</span>
        {meta.map((item) => (
          <span key={item} className="flex items-center gap-3 text-cinema-silver">
            <span aria-hidden className="text-cinema-border">
              •
            </span>
            {item}
          </span>
        ))}
      </div>

      {props.available ? (
        <a
          href={props.href}
          download={props.fileName}
          className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[2px] bg-cinema-accent px-6 py-4 text-sm font-semibold tracking-[0.12em] text-[#3f2e00] transition-colors hover:bg-cinema-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-cinema-bg"
        >
          <Download className="h-5 w-5" aria-hidden />
          {props.label}
        </a>
      ) : (
        <p className="mt-6 rounded-[2px] border border-cinema-border px-6 py-4 text-center text-sm text-cinema-silver">
          Muy pronto disponible
        </p>
      )}

      {props.available && props.qr ? (
        <div className="mt-6 flex items-center gap-5 rounded-[2px] border border-cinema-border/70 bg-cinema-elevated/70 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.qr}
            alt={`Código QR para descargar ${props.fileName}`}
            width={112}
            height={112}
            className="h-24 w-24 shrink-0 rounded-[2px] bg-[#f2eee6] md:h-28 md:w-28"
          />
          <div>
            <p className="font-display text-lg text-cinema-chalk">{props.qrCaption}</p>
            <p className="mt-1 text-sm leading-relaxed text-cinema-silver">{props.qrHint}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 border-t border-cinema-border/70 pt-6">
        <h3 className="text-[11px] font-semibold tracking-[0.2em] text-cinema-silver">
          Pasos de instalación
        </h3>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {props.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed text-cinema-muted">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cinema-accent/50 text-xs text-cinema-accent">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

const FAQ: FaqItem[] = [
  {
    q: '¿Es seguro instalar el APK?',
    a: 'Sí. Los APK de Pelis solo se publican en verpelis.pro y están firmados por Pelis. Android te pedirá permiso para instalar apps de origen desconocido: es normal cuando la app no viene de Play Store.',
  },
  {
    q: '¿Por qué no está en Play Store?',
    a: 'Por ahora distribuimos Pelis directamente desde verpelis.pro. Así publicamos las actualizaciones más rápido, sin esperar revisiones de la tienda.',
  },
  {
    q: '¿Cómo actualizo la app?',
    a: 'La app de TV te avisa cuando hay una versión nueva y la instala encima de la anterior. También puedes volver a esta página y descargar el APK de nuevo.',
  },
  {
    q: 'Mi TV no permite instalar apps',
    a: 'Ve a Ajustes › Preferencias del dispositivo › Seguridad y restricciones (o Mi Fire TV › Opciones para desarrolladores) y activa «Fuentes desconocidas» o «Instalar apps desconocidas» para Downloader o el navegador que uses.',
  },
];

function InAppNotice() {
  return (
    <div className="mx-auto max-w-xl rounded-[2px] border border-cinema-border bg-cinema-surface p-8 text-center">
      <p className="font-display text-3xl text-cinema-chalk">Ya tienes Pelis</p>
      <p className="mt-3 text-sm leading-relaxed text-cinema-silver">
        Estás usando la app. Las actualizaciones llegan solas desde la propia app.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-[2px] bg-cinema-accent px-6 py-3 text-xs font-semibold tracking-[0.14em] text-[#3f2e00]"
      >
        Ir al catálogo
      </Link>
    </div>
  );
}

export default async function DescargasPage() {
  const ua = headers().get('user-agent');
  if (isPelisAppUserAgent(ua)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0e0e10] px-5">
        <InAppNotice />
      </main>
    );
  }

  const availability = await readAppAvailability();
  const [phoneQr, tvQr] = await Promise.all([
    downloadQrDataUrl(APK_DOWNLOAD_URL),
    downloadQrDataUrl(TV_APK_DOWNLOAD_URL),
  ]);

  return (
    <div className="min-h-screen bg-[#0e0e10] text-cinema-chalk">
      <PublicSiteHeader active="descargas" />

      <main>
        <div className="in-app-only px-5 py-24">
          <InAppNotice />
        </div>

        <div className="web-only">
          <section className="relative overflow-hidden border-b border-cinema-border/50">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse 55% 60% at 50% 0%, rgba(229,194,118,0.10), transparent 70%)',
              }}
            />
            <div className="relative mx-auto max-w-4xl px-5 pb-14 pt-14 text-center md:pb-16 md:pt-20">
              <p className="inline-flex items-center gap-2 rounded-full border border-cinema-accent/40 bg-cinema-accent/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cinema-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
                Aplicaciones oficiales
              </p>
              <h1 className="mt-6 font-display text-5xl tracking-tight text-cinema-chalk md:text-7xl">
                Descarga Pelis
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cinema-silver md:text-lg">
                Instala la app en tu celular Android o en tu Android TV / Fire TV. Gratis, sin Play
                Store.
              </p>
              <p className="mt-5 inline-flex items-center gap-2 text-xs text-cinema-silver">
                <ShieldCheck className="h-4 w-4 text-cinema-accent" aria-hidden />
                APK firmados por Pelis y publicados solo en verpelis.pro
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-16">
            <div className="grid gap-6 lg:grid-cols-2">
              <DownloadCard
                eyebrow="Android 6.0 o superior"
                title="Pelis para celular"
                icon={Smartphone}
                fileName="pelis.apk"
                href={APK_DOWNLOAD_PATH}
                label="Descargar para celular"
                available={availability.apkAvailable}
                versionName={availability.apkVersionName}
                size={formatMegabytes(availability.apkSizeBytes)}
                qr={phoneQr}
                qrCaption="Escanea para descargar en tu celular"
                qrHint="Apunta la cámara del celular al código y la descarga empieza al instante."
                steps={[
                  'Descarga pelis.apk',
                  'Permite instalar apps de origen desconocido',
                  'Abre el archivo e instala',
                  'Inicia sesión con tu cuenta',
                ]}
              />
              <DownloadCard
                eyebrow="Android TV / Fire TV"
                title="Pelis para TV"
                subtitle="Pensada para el control remoto"
                icon={Tv}
                fileName="pelis-tv.apk"
                href={TV_APK_DOWNLOAD_PATH}
                label="Descargar para TV"
                available={availability.tvApkAvailable}
                versionName={availability.tvApkVersionName}
                size={formatMegabytes(availability.tvApkSizeBytes)}
                qr={tvQr}
                qrCaption="Escanea con tu celular para obtener el enlace"
                qrHint="Te llevas el enlace directo del APK de TV para compartirlo con tu TV Box."
                steps={[
                  'Instala Downloader en tu TV',
                  'Escribe verpelis.pro/descargas',
                  'Descarga pelis-tv.apk e instala',
                  'Abre Pelis y escanea el QR para entrar',
                ]}
              />
            </div>

            <aside
              role="note"
              className="mt-8 flex items-start gap-4 rounded-[2px] border border-cinema-accent/50 bg-cinema-accent/[0.06] p-5 md:p-6"
            >
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-cinema-accent" aria-hidden />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cinema-accent">
                  Nota para TV
                </p>
                <p className="mt-2 text-sm leading-relaxed text-cinema-chalk md:text-base">
                  Si tu TV dice &apos;App no instalada&apos;, desinstala la versión anterior una vez
                  e instala la nueva.
                </p>
              </div>
            </aside>
          </section>

          <section className="mx-auto max-w-4xl px-5 pb-20 md:pb-28">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-cinema-accent">
              Resolución de dudas
            </p>
            <h2 className="mt-3 text-center font-display text-3xl text-cinema-chalk md:text-4xl">
              Preguntas frecuentes
            </h2>
            <Faq items={FAQ} className="mt-10" />
          </section>
        </div>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
