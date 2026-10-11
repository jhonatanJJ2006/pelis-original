import type { Metadata } from 'next';
import Link from 'next/link';
import { Smartphone, Tv } from 'lucide-react';
import { APK_DOWNLOAD_PATH, TV_APK_DOWNLOAD_PATH } from '@/lib/app-download';

export const metadata: Metadata = {
  title: 'Descargar apps — Pelis',
  description: 'Descarga la app de Pelis para el celular y para la tele.',
};

const downloads = [
  {
    title: 'Celular',
    description: 'La app de Pelis para tu teléfono Android.',
    href: APK_DOWNLOAD_PATH,
    fileName: 'pelis.apk',
    label: 'Descargar para celular',
    icon: Smartphone,
  },
  {
    title: 'Tele',
    description: 'La app de Pelis para Android TV y TV Box.',
    href: TV_APK_DOWNLOAD_PATH,
    fileName: 'pelis-tv.apk',
    label: 'Descargar para la tele',
    icon: Tv,
  },
] as const;

export default function DescargarAppsPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-br from-cinema-bg via-cinema-surface to-cinema-elevated"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(196,163,90,0.14), transparent), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(139,30,45,0.10), transparent)',
        }}
        aria-hidden
      />

      <header className="relative py-6 px-4 z-10 border-b border-cinema-border/60">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 w-fit group">
            <span className="font-display text-2xl font-semibold tracking-[0.12em] text-cinema-accent">
              PELIS
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-cinema-accent hover:text-cinema-accent-light transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="relative flex-1 z-10 px-4 py-12 md:py-16">
        <div className="container mx-auto max-w-3xl">
          <p className="text-cinema-accent text-xs font-medium uppercase tracking-[0.24em] mb-3">
            Apps
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk mb-3">
            Descarga Pelis
          </h1>
          <p className="text-cinema-silver text-base md:text-lg leading-relaxed mb-10 max-w-xl">
            Elige dónde vas a verla: en el celular o en la tele.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {downloads.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.href}
                  className="rounded-lg border border-cinema-border bg-cinema-elevated/80 p-6 flex flex-col"
                >
                  <div className="w-12 h-12 rounded-lg bg-cinema-accent/15 border border-cinema-accent/30 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-cinema-accent" aria-hidden />
                  </div>
                  <h2 className="font-display text-2xl tracking-tight text-cinema-chalk mb-2">
                    {item.title}
                  </h2>
                  <p className="text-cinema-silver text-sm leading-relaxed mb-6 flex-1">
                    {item.description}
                  </p>
                  <a
                    href={item.href}
                    download={item.fileName}
                    className="inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 bg-gradient-to-r from-cinema-accent to-cinema-accent-light text-cinema-bg hover:brightness-110 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 py-3 px-4 text-sm"
                  >
                    {item.label}
                  </a>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 px-4 border-t border-cinema-border/60 text-center text-cinema-ash text-sm">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Pelis</p>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-cinema-accent transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-cinema-accent transition-colors">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
