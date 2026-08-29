import Link from 'next/link';
import { Film } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cinema-accent to-cinema-gold flex items-center justify-center mb-6 shadow-glow">
        <Film className="w-7 h-7 text-cinema-bg" aria-hidden />
      </div>
      <p className="text-cinema-accent text-sm font-medium uppercase tracking-[0.28em] mb-3">404</p>
      <h1 className="font-display text-4xl md:text-6xl tracking-tight text-cinema-chalk mb-4">
        Esta sala está vacía
      </h1>
      <p className="text-cinema-muted max-w-md mb-8">
        No encontramos esa página. Vuelve al foyer o recorre el catálogo.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary">
          Volver al inicio
        </Link>
        <Link href="/movies" className="btn-secondary">
          Ver películas
        </Link>
      </div>
    </div>
  );
}
