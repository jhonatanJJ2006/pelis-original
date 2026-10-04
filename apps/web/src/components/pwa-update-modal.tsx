'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { usePwaUpdate } from '@/hooks/use-pwa-update';

export interface PwaUpdateModalViewProps {
  versionLabel?: string | null;
  updating?: boolean;
  onAccept: () => void;
  onLater: () => void;
  /** En playground se muestra embebido, sin portal a pantalla completa. */
  embedded?: boolean;
}

export function PwaUpdateModalView({
  versionLabel,
  updating = false,
  onAccept,
  onLater,
  embedded = false,
}: PwaUpdateModalViewProps) {
  useEffect(() => {
    if (embedded) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !updating) onLater();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [embedded, onLater, updating]);

  const dialog = (
    <div
      className={cn(
        'relative w-full max-w-md rounded-2xl border border-cinema-border bg-cinema-elevated',
        'shadow-[0_24px_64px_rgba(11,11,13,0.65)] overflow-hidden'
      )}
    >
      <div className="p-6 md:p-8">
        <p className="text-cinema-accent text-xs font-medium uppercase tracking-widest mb-3">
          Actualización
        </p>
        <div className="flex items-start gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-cinema-accent/15 border border-cinema-accent/30 flex items-center justify-center shrink-0">
            <RefreshCw
              className={cn('w-6 h-6 text-cinema-accent', updating && 'motion-safe:animate-spin')}
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <h2
              id="pwa-update-title"
              className="font-display text-2xl tracking-tight text-cinema-chalk leading-tight"
            >
              Hay una nueva versión
            </h2>
            {versionLabel ? (
              <p className="mt-1.5 text-xs text-cinema-muted">Versión {versionLabel}</p>
            ) : null}
          </div>
        </div>

        <p className="text-cinema-muted text-sm leading-relaxed mb-6">
          Hay novedades y mejoras listas en Pelis. ¿Quieres actualizar ahora para ver lo último?
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onLater}
            disabled={updating}
            className="w-full sm:flex-1"
          >
            Más tarde
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onAccept}
            disabled={updating}
            className="w-full sm:flex-1"
          >
            {updating ? 'Actualizando…' : 'Aceptar'}
          </Button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div role="dialog" aria-labelledby="pwa-update-title" aria-modal="false">
        {dialog}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cinema-bg/70 backdrop-blur-sm motion-safe:animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-update-title"
    >
      {dialog}
    </div>
  );
}

export function PwaUpdateModal() {
  // Mantiene el service worker (registro y comprobación), pero nunca pinta
  // el diálogo. El aviso de actualización vive solo en las apps Android.
  usePwaUpdate();
  return null;
}
