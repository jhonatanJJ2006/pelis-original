import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
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
            'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(229,194,118,0.14), transparent), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(139,30,45,0.10), transparent)',
        }}
        aria-hidden
      />

      <header className="relative py-6 px-4 z-10 border-b border-cinema-border/60">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex flex-col w-fit group leading-none">
            <span className="font-display text-2xl font-semibold tracking-[0.12em] text-cinema-accent">
              PELIS
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/terminos"
              className="text-cinema-silver hover:text-cinema-accent transition-colors"
            >
              Términos
            </Link>
            <Link
              href="/privacidad"
              className="text-cinema-silver hover:text-cinema-accent transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/login"
              className="text-cinema-accent hover:text-cinema-accent-light transition-colors"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative flex-1 z-10 px-4 py-10 md:py-14">
        <div className="container mx-auto grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav
              aria-label="Documentos legales"
              className="sticky top-8 border border-cinema-border/70 bg-cinema-surface/80 p-5 rounded-[2px]"
            >
              <p className="font-display text-lg text-cinema-accent mb-4">Marco legal</p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link
                    href="/terminos"
                    className="block border-l-2 border-transparent px-3 py-2 text-cinema-silver hover:border-cinema-accent hover:text-cinema-chalk"
                  >
                    Términos y condiciones
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacidad"
                    className="block border-l-2 border-transparent px-3 py-2 text-cinema-silver hover:border-cinema-accent hover:text-cinema-chalk"
                  >
                    Política de privacidad
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
          <div className="legal-doc min-w-0">{children}</div>
        </div>
      </main>

      <footer className="relative z-10 py-6 px-4 border-t border-cinema-border/60 text-center text-cinema-ash text-sm">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Pelis (verpelis.pro)</p>
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
