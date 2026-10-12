'use client';

import { Spinner } from '../../shared/ui/spinner';
import { cn } from '../../shared/utils';

export function PlayerLoadingOverlay({
  poster,
  message = 'Cargando…',
  opaque = true,
}: {
  poster?: string;
  message?: string;
  opaque?: boolean;
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center',
        opaque ? 'bg-cinema-bg' : 'bg-cinema-bg/70'
      )}
      style={{ backgroundColor: opaque ? '#131315' : undefined }}
      role="status"
      aria-label={message}
    >
      {poster ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url("${poster.replace(/"/g, '')}")` }}
          aria-hidden
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(11,11,13,0.9)_100%)]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        <span className="font-display text-2xl font-light uppercase tracking-[0.3em] text-cinema-accent">
          Pelis
        </span>
        <Spinner size="lg" className="h-10 w-10 text-cinema-accent" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-cinema-chalk/75">{message}</p>
      </div>
    </div>
  );
}
