import Link from 'next/link';

const LINKS = [
  { href: '/inicio', label: 'Inicio' },
  { href: '/', label: 'Catálogo' },
  { href: '/subscribe', label: 'Planes' },
  { href: '/descargas', label: 'Descargas', webOnly: true },
  { href: '/login', label: 'Iniciar sesión' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/terminos', label: 'Términos' },
];

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-cinema-border/70 bg-[#0e0e10]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-10">
        <div className="max-w-sm">
          <p className="font-display text-2xl font-semibold tracking-[0.16em] text-cinema-accent">
            PELIS
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-cinema-silver">
            Maison Noir
          </p>
          <p className="mt-4 text-sm leading-relaxed text-cinema-silver">
            Películas, series, anime y canales en vivo en un solo lugar.
          </p>
        </div>
        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {LINKS.map((link) => (
              <li key={link.href} className={link.webOnly ? 'web-only' : undefined}>
                <Link
                  href={link.href}
                  className="text-cinema-muted transition-colors hover:text-cinema-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-cinema-border/50">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-cinema-ash md:px-10">
          © {new Date().getFullYear()} Pelis · verpelis.pro
        </p>
      </div>
    </footer>
  );
}
