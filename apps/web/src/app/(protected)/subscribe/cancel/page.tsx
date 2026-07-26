'use client';

import Link from 'next/link';
import { XCircle, Crown } from 'lucide-react';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { Button } from '@pelis/ui/components';

export default function SubscribeCancelPage() {
  return (
    <div className="page-shell min-h-[80vh] flex items-center justify-center">
      <ScrollReveal className="text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-14 h-14 bg-red-500/80 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-4">
          Pago cancelado
        </h1>
        <p className="text-cinema-muted text-lg mb-8">
          El proceso de pago fue cancelado. No se ha realizado ningún cargo. Puedes intentarlo de
          nuevo cuando quieras.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/subscribe">
            <Button className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Intentar de nuevo
            </Button>
          </Link>
          <Link
            href="/"
            className="text-cinema-silver hover:text-white transition-colors text-sm font-medium"
          >
            Volver al inicio
          </Link>
        </div>
      </ScrollReveal>
    </div>
  );
}
