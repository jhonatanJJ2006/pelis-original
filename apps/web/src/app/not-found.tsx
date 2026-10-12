import Link from 'next/link';
import { Clapperboard, Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-cinema-accent/40 bg-cinema-accent/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cinema-accent">
        <Clapperboard className="h-3.5 w-3.5" aria-hidden />
        Corte de proyección
      </p>
      <p className="font-display text-[7rem] md:text-[10rem] leading-none text-cinema-accent drop-shadow-[0_0_40px_rgba(229,194,118,0.25)]">
        404
      </p>
      <h1 className="font-display italic text-3xl md:text-4xl tracking-tight text-cinema-chalk mt-2 mb-4">
        Esta escena no existe
      </h1>
      <p className="text-cinema-muted max-w-md mb-8">
        El plano que intentas reproducir fue descartado del montaje o no está en nuestro archivo.
        Continúa explorando el catálogo.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary rounded-[2px]">
          <Home className="h-4 w-4" aria-hidden />
          Volver al inicio
        </Link>
        <Link href="/movies" className="btn-secondary rounded-[2px]">
          <Compass className="h-4 w-4" aria-hidden />
          Explorar catálogo completo
        </Link>
      </div>
    </div>
  );
}
