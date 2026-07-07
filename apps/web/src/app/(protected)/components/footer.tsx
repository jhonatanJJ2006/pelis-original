import Link from 'next/link';
import { Film, Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-cinema-surface border-t border-cinema-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-cinema-accent flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-2xl tracking-widest text-white uppercase">
                Pelis
              </span>
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Tu sala de cine en casa. Películas, series y estrenos con una experiencia pensada para disfrutar sin distracciones.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest text-zinc-300 uppercase mb-4">
              Explorar
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: '/', label: 'Inicio' },
                { href: '/movies', label: 'Películas' },
                { href: '/series', label: 'Series' },
                { href: '/favorites', label: 'Favoritos' },
                { href: '/history', label: 'Historial' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-zinc-500 hover:text-cinema-gold text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest text-zinc-300 uppercase mb-4">
              Cuenta
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/login" className="text-zinc-500 hover:text-white text-sm transition-colors">
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <Link href="/subscribe" className="text-zinc-500 hover:text-cinema-gold text-sm transition-colors">
                  Suscripción Premium
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest text-zinc-300 uppercase mb-4">
              Comunidad
            </h4>
            <div className="flex gap-3">
              {[
                { icon: Twitter, label: 'Twitter' },
                { icon: Github, label: 'GitHub' },
                { icon: Mail, label: 'Email' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="w-10 h-10 rounded-xl bg-cinema-elevated border border-cinema-border flex items-center justify-center text-zinc-500 hover:text-cinema-gold hover:border-cinema-gold/30 transition-all"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-cinema-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-zinc-600 text-sm">
            © {new Date().getFullYear()} Pelis. Todos los derechos reservados.
          </p>
          <p className="text-zinc-700 text-xs tracking-wide uppercase">
            Hecho para amantes del cine
          </p>
        </div>
      </div>
    </footer>
  );
}
