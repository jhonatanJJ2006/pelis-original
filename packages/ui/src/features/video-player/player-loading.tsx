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
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
        <Spinner size="lg" className="h-10 w-10 text-cinema-accent" />
        <p className="font-display text-sm tracking-wide text-cinema-chalk/85">{message}</p>
      </div>
    </div>
  );
}
