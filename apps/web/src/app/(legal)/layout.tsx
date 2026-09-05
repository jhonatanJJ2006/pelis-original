import Link from 'next/link';
import { Film } from 'lucide-react';

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
            'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(196,163,90,0.14), transparent), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(139,30,45,0.10), transparent)',
        }}
        aria-hidden
      />

      <header className="relative py-6 px-4 z-10 border-b border-cinema-border/60">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 w-fit group">
            <div className="w-10 h-10 bg-gradient-to-br from-cinema-accent to-cinema-gold rounded flex items-center justify-center group-hover:scale-105 transition-transform shadow-glow">
              <Film className="w-6 h-6 text-cinema-bg" aria-hidden />
            </div>
            <span className="font-display text-2xl tracking-tight text-cinema-chalk">Pelis</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/terminos"
              className="text-cinema-silver hover:text-cinema-gold transition-colors"
            >
              Términos
            </Link>
            <Link
              href="/privacidad"
              className="text-cinema-silver hover:text-cinema-gold transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/login"
              className="text-cinema-gold hover:text-cinema-gold-light transition-colors"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative flex-1 z-10 px-4 py-10 md:py-14">{children}</main>

      <footer className="relative z-10 py-6 px-4 border-t border-cinema-border/60 text-center text-cinema-ash text-sm">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Pelis (verpelis.pro)</p>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-cinema-gold transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-cinema-gold transition-colors">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
