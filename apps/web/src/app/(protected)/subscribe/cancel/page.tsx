'use client';

import Link from 'next/link';
import { XCircle, Crown } from 'lucide-react';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { Button } from '@pelis/ui/components';

export default function SubscribeCancelPage() {
  return (
    <div className="page-shell min-h-[80vh] flex items-center justify-center">
      <ScrollReveal className="text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 border border-cinema-danger-light/60 bg-cinema-surface rounded-[4px] flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-7 h-7 text-red-300" />
        </div>

        <p className="text-label uppercase text-cinema-accent mb-3">Transacción interrumpida</p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk mb-4">
          No se completó el pago
        </h1>
        <p className="text-cinema-muted text-lg mb-8">
          El proceso de pago fue cancelado. No se ha realizado ningún cargo. Puedes intentarlo de
          nuevo cuando quieras.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/subscribe">
            <Button className="flex items-center gap-2 rounded-[2px] px-8">
              <Crown className="w-4 h-4" />
              Intentar de nuevo
            </Button>
          </Link>
          <Link
            href="/"
            className="text-cinema-silver hover:text-cinema-chalk transition-colors text-sm font-medium"
          >
            Volver al inicio
          </Link>
        </div>
      </ScrollReveal>
    </div>
  );
}
