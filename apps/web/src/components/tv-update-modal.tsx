'use client';

import { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';
import { useTvApkUpdate } from '@/hooks/use-tv-apk-update';

export interface TvUpdateModalViewProps {
  versionLabel?: string | null;
  updating?: boolean;
  onAccept: () => void;
  onLater: () => void;
  embedded?: boolean;
}

export function TvUpdateModalView({
  versionLabel,
  updating = false,
  onAccept,
  onLater,
  embedded = false,
}: TvUpdateModalViewProps) {
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (embedded) return;
    acceptRef.current?.focus();
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
        'relative w-full max-w-lg rounded-2xl border border-cinema-border bg-cinema-elevated',
        'shadow-[0_24px_64px_rgba(11,11,13,0.65)] overflow-hidden'
      )}
    >
      <div className="p-8">
        <p className="text-cinema-accent text-xs font-medium uppercase tracking-widest mb-3">
          Actualización
        </p>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-xl bg-cinema-accent/15 border border-cinema-accent/30 flex items-center justify-center shrink-0">
            <RefreshCw
              className={cn('w-7 h-7 text-cinema-accent', updating && 'motion-safe:animate-spin')}
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <h2
              id="tv-apk-update-title"
              className="font-display text-3xl tracking-tight text-cinema-chalk"
            >
              Hay una nueva app de TV
            </h2>
            {versionLabel ? (
              <p className="mt-1.5 text-sm text-cinema-muted">Versión {versionLabel}</p>
            ) : null}
          </div>
        </div>
        <p className="text-cinema-muted text-base leading-relaxed mb-8">
          Hay una versión nueva de Pelis para Android TV. Actualiza para seguir con login, QR y
          canales en vivo.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onLater}
            disabled={updating}
            className="w-full sm:flex-1 min-h-12 tv-focus"
          >
            Más tarde
          </Button>
          <Button
            ref={acceptRef}
            type="button"
            variant="primary"
            onClick={onAccept}
            disabled={updating}
            className="w-full sm:flex-1 min-h-12 tv-focus"
          >
            {updating ? 'Abriendo descarga…' : 'Actualizar ahora'}
          </Button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div role="dialog" aria-labelledby="tv-apk-update-title" aria-modal="false">
        {dialog}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-cinema-bg/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-apk-update-title"
    >
      {dialog}
    </div>
  );
}

export function TvUpdateModal() {
  const { visible, updating, versionLabel, accept, dismiss } = useTvApkUpdate();
  if (!visible) return null;
  return (
    <TvUpdateModalView
      versionLabel={versionLabel}
      updating={updating}
      onAccept={accept}
      onLater={dismiss}
    />
  );
}
