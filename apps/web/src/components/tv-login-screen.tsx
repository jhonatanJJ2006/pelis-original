'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@pelis/auth/hooks';
import { authClient } from '@pelis/auth/client';
import { Film } from 'lucide-react';
import { cn } from '@pelis/ui/utils';

interface PairingPayload {
  code: string;
  displayCode: string;
  deviceId: string;
  expiresAt: string;
  verifyUrl: string;
  status: string;
}

const DEVICE_KEY = 'pelis_tv_device_id';

function readDeviceId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage.getItem(DEVICE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function persistDeviceId(id: string) {
  try {
    window.localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // storage bloqueado
  }
}

export function TvLoginScreen() {
  const { user, isLoading } = useUser();
  const [pairing, setPairing] = useState<PairingPayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const claiming = useRef(false);

  const goLiveTv = useCallback(() => {
    window.location.assign('/tv');
  }, []);

  const createPairing = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/tv-auth/pairing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: readDeviceId() }),
      });
      const json = (await res.json()) as PairingPayload & { error?: string };
      if (!res.ok) {
        setError(json.error || 'No se pudo crear el código');
        return;
      }
      persistDeviceId(json.deviceId);
      setPairing(json);
    } catch {
      setError('Error de conexión. Reintenta.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      goLiveTv();
      return;
    }
    void createPairing();
  }, [user, isLoading, createPairing, goLiveTv]);

  useEffect(() => {
    if (!pairing || user) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/tv-auth/pairing?code=${encodeURIComponent(pairing.code)}&deviceId=${encodeURIComponent(pairing.deviceId)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const json = (await res.json()) as { status?: string };
        if (cancelled) return;
        if (json.status === 'expired') {
          void createPairing();
          return;
        }
        if (json.status !== 'approved' && json.status !== 'claimed') return;
        if (claiming.current) return;
        claiming.current = true;
        const claim = await fetch('/api/tv-auth/claim', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: pairing.code, deviceId: pairing.deviceId }),
        });
        if (!claim.ok) {
          claiming.current = false;
          const err = (await claim.json().catch(() => ({}))) as { error?: string };
          setError(err.error || 'No se pudo completar el acceso');
          return;
        }
        await authClient.getSession({ query: { disableCookieCache: true } });
        goLiveTv();
      } catch {
        claiming.current = false;
      }
    };

    const id = window.setInterval(() => {
      void poll();
    }, 2500);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pairing, user, createPairing, goLiveTv]);

  const qrSrc = pairing ? `/api/tv-auth/qr?data=${encodeURIComponent(pairing.verifyUrl)}` : '';

  return (
    <div className="fixed inset-0 z-50 bg-cinema-bg text-cinema-chalk">
      <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(18rem,38%)_1fr]">
        <section className="relative flex flex-col justify-between p-8 md:p-12 bg-cinema-surface border-r border-cinema-border">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 70% 50% at 20% 20%, rgba(196,163,90,0.16), transparent)',
            }}
            aria-hidden
          />
          <div className="relative">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cinema-accent to-cinema-gold flex items-center justify-center shadow-glow">
                <Film className="w-7 h-7 text-cinema-bg" aria-hidden />
              </div>
              <span className="font-display text-3xl tracking-tight">Pelis</span>
            </div>
            <p className="text-cinema-accent text-xs font-medium uppercase tracking-widest mb-3">
              Televisión
            </p>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[0.95] max-w-sm">
              Iniciar sesión
            </h1>
            <p className="text-cinema-muted text-lg mt-5 max-w-md leading-relaxed">
              Escanea el código QR con tu celular o entra a verpelis.pro/link-tv e ingresa el
              código.
            </p>
          </div>
          <p className="relative text-cinema-ash text-sm">Canales en vivo al terminar.</p>
        </section>

        <section className="flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-xl">
            <div className="rounded-2xl border border-cinema-border bg-cinema-elevated/80 p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="shrink-0 rounded-xl bg-cinema-chalk p-3">
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrSrc}
                      alt="Código QR para vincular la tele"
                      width={220}
                      height={220}
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] bg-cinema-border/40 animate-pulse rounded" />
                  )}
                </div>
                <div className="min-w-0 text-center md:text-left">
                  <p className="text-[11px] uppercase tracking-widest text-cinema-ash mb-2">
                    Tu código
                  </p>
                  <p className="font-display text-5xl tracking-[0.18em] text-cinema-chalk tabular-nums">
                    {pairing?.displayCode ?? '······'}
                  </p>
                  <p className="text-cinema-muted text-sm mt-4 leading-relaxed">
                    En el celular, con tu cuenta de Pelis, abre{' '}
                    <span className="text-cinema-chalk">verpelis.pro/link-tv</span> y confirma.
                  </p>
                  {error ? (
                    <p className="mt-3 text-sm text-cinema-danger-light" role="alert">
                      {error}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-cinema-silver">Esperando confirmación…</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void createPairing()}
                    disabled={busy}
                    className={cn(
                      'mt-6 btn-secondary min-h-12 px-6 tv-focus',
                      busy && 'opacity-60'
                    )}
                  >
                    {busy ? 'Generando…' : 'Nuevo código'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
