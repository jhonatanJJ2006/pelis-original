'use client';

import { useQuery } from 'convex/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tv, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@pelis/convex';
import { Spinner } from '@pelis/ui/components';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import dynamic from 'next/dynamic';

const TVPlayer = dynamic(
  () => import('./tv-player'),
  { ssr: false, loading: () => (
    <div className="aspect-video bg-cinema-elevated rounded-2xl flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-cinema-silver animate-spin" />
    </div>
  )}
);

interface TVChannel {
  _id: string;
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
  source: string;
  language: string;
  isActive: boolean;
}

export default function TVChannelPage() {
  const params = useParams();
  const id = params.id as string;
  const channel = useQuery(api.tv.getById, { id: id as any }) as TVChannel | null | undefined;

  const isLoading = channel === undefined;

  if (isLoading) {
    return (
      <div className="page-shell min-h-[60vh] flex items-center justify-center" role="status" aria-label="Cargando">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="page-shell min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-cinema-muted mx-auto mb-4" />
          <h1 className="font-display text-3xl text-white uppercase mb-2">Canal no encontrado</h1>
          <p className="text-cinema-muted mb-6">El canal que buscas no está disponible.</p>
          <Link
            href="/tv"
            className="inline-flex items-center gap-2 text-cinema-violet-light hover:text-cinema-violet transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a TV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <ScrollReveal className="mb-6">
        <Link
          href="/tv"
          className="inline-flex items-center gap-2 text-cinema-silver hover:text-white transition-colors text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Todos los canales
        </Link>
        <div className="flex items-center gap-4">
          {channel.logo ? (
            <img src={channel.logo} alt={channel.name} className="w-12 h-12 object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-cinema-elevated border border-cinema-border flex items-center justify-center">
              <Tv className="w-6 h-6 text-cinema-silver" />
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl md:text-4xl tracking-wide text-white uppercase">
              {channel.name}
            </h1>
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-red-400 font-semibold mt-1">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              EN VIVO
            </span>
          </div>
        </div>
      </ScrollReveal>

      <div className="rounded-2xl overflow-hidden bg-black border border-cinema-border">
        <TVPlayer streamUrl={channel.streamUrl} channelName={channel.name} />
      </div>

      <div className="mt-6 p-4 rounded-xl bg-cinema-surface border border-cinema-border">
        <p className="text-sm text-cinema-muted">
          <span className="text-cinema-silver font-medium">Categoría:</span>{' '}
          {channel.category}
          <span className="mx-3">·</span>
          <span className="text-cinema-silver font-medium">Fuente:</span>{' '}
          {channel.source}
          <span className="mx-3">·</span>
          <span className="text-cinema-silver font-medium">Idioma:</span>{' '}
          {channel.language === 'es' ? 'Español' : channel.language}
        </p>
      </div>
    </div>
  );
}
