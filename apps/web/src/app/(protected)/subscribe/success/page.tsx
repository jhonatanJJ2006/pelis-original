'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Crown, Film } from 'lucide-react';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { Button } from '@pelis/ui/components';

export default function SubscribeSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, [sessionId]);

  return (
    <div className="page-shell min-h-[80vh] flex items-center justify-center">
      <ScrollReveal className="text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-white uppercase mb-4">
          ¡Suscripción activada!
        </h1>
        <p className="text-cinema-muted text-lg mb-8">
          Gracias por suscribirte. Ya puedes disfrutar de todo el contenido premium sin límites.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <Button className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Ir al inicio
            </Button>
          </Link>
          <Link
            href="/movies"
            className="text-cinema-silver hover:text-white transition-colors text-sm font-medium"
          >
            Explorar películas
          </Link>
        </div>
      </ScrollReveal>
    </div>
  );
}
