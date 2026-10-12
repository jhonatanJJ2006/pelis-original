import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-br from-cinema-bg via-cinema-surface to-cinema-elevated"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(229,194,118,0.18), transparent), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(139,30,45,0.12), transparent)',
        }}
        aria-hidden
      />

      <header className="relative py-6 px-4 z-10">
        <div className="container mx-auto">
          <Link href="/" className="flex items-center gap-2.5 w-fit group">
            <span className="font-display text-2xl font-semibold tracking-[0.12em] text-cinema-accent">
              PELIS
            </span>
          </Link>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4 pb-12 z-10">
        {children}
      </main>

      <footer className="relative py-6 text-center text-cinema-ash text-sm z-10 space-y-2">
        <div className="flex items-center justify-center gap-4">
          <Link href="/terminos" className="hover:text-cinema-accent transition-colors">
            Términos
          </Link>
          <Link href="/privacidad" className="hover:text-cinema-accent transition-colors">
            Privacidad
          </Link>
        </div>
        <p>© {new Date().getFullYear()} Pelis. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
