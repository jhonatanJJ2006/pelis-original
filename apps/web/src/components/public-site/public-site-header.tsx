import Link from 'next/link';
import { cn } from '@pelis/ui/utils';

interface NavItem {
  href: string;
  label: string;
  webOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/inicio#incluye', label: 'Contenido' },
  { href: '/descargas', label: 'Descargas', webOnly: true },
  { href: '/inicio#planes', label: 'Planes' },
  { href: '/inicio#preguntas', label: 'Preguntas' },
];

/** Cabecera pública Maison Noir de /inicio y /descargas (sin chrome del catálogo). */
export function PublicSiteHeader({ active }: { active?: 'inicio' | 'descargas' }) {
  return (
    <header className="sticky top-0 z-40 border-b border-cinema-border/60 bg-[#0e0e10]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 md:h-[72px] md:px-10">
        <Link
          href="/inicio"
          className="flex items-baseline gap-3 leading-none"
          aria-label="Pelis — inicio"
        >
          <span className="font-display text-2xl font-semibold tracking-[0.16em] text-cinema-accent">
            PELIS
          </span>
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-8 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-cinema-muted transition-colors hover:text-cinema-accent',
                item.webOnly && 'web-only',
                active === 'descargas' &&
                  item.href === '/descargas' &&
                  'text-cinema-accent underline decoration-cinema-accent underline-offset-[10px]'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-[2px] border border-cinema-accent/70 px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-cinema-accent transition-colors hover:bg-cinema-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="hidden rounded-[2px] bg-cinema-accent px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-[#3f2e00] transition-colors hover:bg-cinema-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-accent/60 lg:inline-flex"
          >
            Empieza ahora
          </Link>
        </div>
      </div>
    </header>
  );
}
