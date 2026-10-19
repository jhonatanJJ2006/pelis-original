'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, X } from 'lucide-react';
import { Button, Spinner } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';

const BATCH_SIZE = 15;

interface ChannelRef {
  _id: string;
  name: string;
}

interface VerifyChannelsModalProps {
  channels: ChannelRef[];
  checkChannel: (args: { channelId: string }) => Promise<{
    streamStatus: 'online' | 'offline';
    lastStreamError?: string;
  }>;
  onClose: () => void;
  onComplete: (stats: {
    online: number;
    offline: number;
    total: number;
    cancelled: boolean;
  }) => void;
}

type Phase = 'idle' | 'running' | 'done' | 'cancelled';

export function VerifyChannelsModal({
  channels,
  checkChannel,
  onClose,
  onComplete,
}: VerifyChannelsModalProps) {
  const cancelledRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [done, setDone] = useState(0);
  const [online, setOnline] = useState(0);
  const [offline, setOffline] = useState(0);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);

  const total = channels.length;
  const remaining = Math.max(0, total - done);
  const totalBatches = Math.max(1, Math.ceil(total / BATCH_SIZE));
  const progressPct = total === 0 ? 0 : Math.round((done / total) * 100);

  const run = useCallback(async () => {
    cancelledRef.current = false;
    setPhase('running');
    setDone(0);
    setOnline(0);
    setOffline(0);

    let doneCount = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    const batches = Math.max(1, Math.ceil(channels.length / BATCH_SIZE));

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      if (cancelledRef.current) break;

      setCurrentBatch(batchIndex + 1);
      const batchStart = batchIndex * BATCH_SIZE;
      const batch = channels.slice(batchStart, batchStart + BATCH_SIZE);

      for (const ch of batch) {
        if (cancelledRef.current) break;

        setCurrentName(ch.name);

        try {
          const result = await checkChannel({ channelId: ch._id });
          if (result.streamStatus === 'online') onlineCount += 1;
          else offlineCount += 1;
        } catch {
          offlineCount += 1;
        }

        doneCount += 1;
        setDone(doneCount);
        setOnline(onlineCount);
        setOffline(offlineCount);
      }

      if (!cancelledRef.current && batchIndex < batches - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const cancelled = cancelledRef.current;
    setCurrentName(null);
    setPhase(cancelled ? 'cancelled' : 'done');
    onComplete({
      online: onlineCount,
      offline: offlineCount,
      total: doneCount,
      cancelled,
    });
  }, [channels, checkChannel, onComplete]);

  useEffect(() => {
    void run();
    // Solo al montar el modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    cancelledRef.current = true;
  };

  const canClose = phase === 'done' || phase === 'cancelled';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={canClose ? onClose : undefined}
    >
      <div
        className="w-full max-w-md rounded-[2px] border border-cinema-border bg-cinema-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-channels-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-cinema-border">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cinema-accent-light" />
            <h2
              id="verify-channels-title"
              className="font-display text-lg tracking-wide text-cinema-chalk"
            >
              Verificar canales
            </h2>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[2px] text-cinema-muted hover:text-cinema-chalk hover:bg-cinema-elevated transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">
          {phase === 'running' && (
            <div className="flex items-center gap-3 text-cinema-muted text-sm">
              <Spinner className="w-5 h-5 shrink-0" />
              <span>Verificando streams en lotes de {BATCH_SIZE}...</span>
            </div>
          )}

          {phase === 'done' && (
            <p className="text-sm text-cinema-success">Verificación completada.</p>
          )}

          {phase === 'cancelled' && (
            <p className="text-sm text-amber-300">Verificación cancelada.</p>
          )}

          <div>
            <div className="flex justify-between text-xs text-cinema-muted mb-2">
              <span>
                {done} de {total} verificados
              </span>
              <span>{remaining} restantes</span>
            </div>
            <div className="h-2 rounded-full bg-cinema-elevated overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  phase === 'cancelled' ? 'bg-amber-500' : 'bg-cinema-accent'
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-cinema-ash mt-1.5">
              Lote {Math.min(currentBatch, totalBatches)} de {totalBatches}
            </p>
          </div>

          {currentName && phase === 'running' && (
            <p className="text-sm text-cinema-silver truncate">
              Verificando: <span className="text-cinema-chalk">{currentName}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[2px] bg-cinema-success/10 border border-cinema-success/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-cinema-success/80">Online</p>
              <p className="text-2xl font-semibold text-cinema-success mt-0.5">{online}</p>
            </div>
            <div className="rounded-[2px] bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-red-300/80">Caídos</p>
              <p className="text-2xl font-semibold text-red-300 mt-0.5">{offline}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-cinema-border flex justify-end gap-2">
          {phase === 'running' ? (
            <Button variant="secondary" onClick={handleCancel}>
              Cancelar
            </Button>
          ) : (
            <Button onClick={onClose}>Cerrar</Button>
          )}
        </div>
      </div>
    </div>
  );
}
