import Link from 'next/link';
import { Film } from 'lucide-react';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

import { cn } from '@pelis/ui/utils';

const exploreLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/movies', label: 'Películas' },
  { href: '/series', label: 'Series' },
  { href: '/tv', label: 'TV' },
  { href: '/anime', label: 'Anime' },
];

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'bg-cinema-surface/80 border-t border-cinema-border mt-auto backdrop-blur-sm',
        className
      )}
    >
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded bg-gradient-to-br from-cinema-accent to-cinema-gold flex items-center justify-center">
                <Film className="w-5 h-5 text-cinema-bg" aria-hidden />
              </div>
              <span className="font-display text-2xl tracking-tight text-cinema-chalk">
                Pelis
              </span>
            </Link>
            <p className="text-cinema-silver text-sm leading-relaxed max-w-xs">
              Tu sala de cine en casa. Películas, series y estrenos con una experiencia pensada para
              disfrutar sin distracciones.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm tracking-widest text-cinema-muted uppercase mb-4">
              Explorar
            </h3>
            <ul className="space-y-2.5">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cinema-silver hover:text-cinema-gold text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm tracking-widest text-cinema-muted uppercase mb-4">
              Cuenta
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/profile"
                  className="text-cinema-silver hover:text-white text-sm transition-colors"
                >
                  Mi perfil
                </Link>
              </li>
              <li>
                <Link
                  href="/favorites"
                  className="text-cinema-silver hover:text-white text-sm transition-colors"
                >
                  Favoritos
                </Link>
              </li>
              <li>
                <Link
                  href="/history"
                  className="text-cinema-silver hover:text-white text-sm transition-colors"
                >
                  Historial
                </Link>
              </li>
              <li>
                <Link
                  href="/subscribe"
                  className="text-cinema-silver hover:text-cinema-gold text-sm transition-colors"
                >
                  Suscripción
                </Link>
              </li>
            </ul>
          </div>

          <PwaInstallPrompt variant="inline" />
        </div>

        <div className="mt-10 pt-8 border-t border-cinema-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cinema-ash text-sm">
            © {new Date().getFullYear()} Pelis. Todos los derechos reservados.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link href="/terminos" className="text-cinema-ash hover:text-cinema-gold transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="text-cinema-ash hover:text-cinema-gold transition-colors">
              Privacidad
            </Link>
            <span className="text-cinema-ash text-xs tracking-wide uppercase hidden sm:inline">
              Hecho para amantes del cine
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
