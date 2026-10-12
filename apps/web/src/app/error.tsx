'use client';

import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-shell min-h-[60vh] flex items-center justify-center">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[4px] border border-cinema-danger-light/60 bg-cinema-surface">
          <AlertTriangle className="h-7 w-7 text-red-300" aria-hidden />
        </div>
        <p className="text-label uppercase text-cinema-accent mb-3">
          Interrupción de la proyección
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk mb-4">
          Algo salió mal
        </h1>
        <p className="text-cinema-muted mb-8">
          No pudimos mostrar esta página. Inténtalo de nuevo en unos segundos.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary rounded-[2px]">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reintentar
          </button>
          <Link href="/" className="btn-secondary rounded-[2px]">
            <Home className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
