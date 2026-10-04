'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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

type TvLoginPanel = 'qr' | 'email';

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
  const [panel, setPanel] = useState<TvLoginPanel>('qr');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
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

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setAuthError('Completa correo y contraseña');
      return;
    }
    setAuthBusy(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        setAuthError(signInError.message || 'No se pudo iniciar sesión');
        return;
      }
      await authClient.getSession({ query: { disableCookieCache: true } });
      goLiveTv();
    } catch {
      setAuthError('Error de conexión. Reintenta.');
    } finally {
      setAuthBusy(false);
    }
  };

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
              Escanea el código QR o entra con correo y contraseña. Si usas el código, confirma en
              verpelis.pro/link-tv.
            </p>
            <div className="mt-8 flex flex-col gap-3 max-w-xs">
              <button
                type="button"
                tabIndex={0}
                onClick={() => setPanel('qr')}
                className={cn(
                  'min-h-12 px-5 rounded-[10px] text-left font-semibold tv-focus',
                  panel === 'qr'
                    ? 'bg-cinema-accent text-cinema-bg'
                    : 'bg-cinema-elevated text-cinema-chalk border border-cinema-border'
                )}
              >
                Código QR
              </button>
              <button
                type="button"
                tabIndex={0}
                onClick={() => {
                  setAuthError('');
                  setPanel('email');
                }}
                className={cn(
                  'min-h-12 px-5 rounded-[10px] text-left font-semibold tv-focus',
                  panel === 'email'
                    ? 'bg-cinema-accent text-cinema-bg'
                    : 'bg-cinema-elevated text-cinema-chalk border border-cinema-border'
                )}
              >
                Entrar con correo
              </button>
            </div>
          </div>
          <p className="relative text-cinema-ash text-sm">Canales en vivo al terminar.</p>
        </section>

        <section className="flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-xl">
            {panel === 'qr' ? (
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
                    <div className="mt-6 flex flex-col gap-3 items-center md:items-start">
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={() => void createPairing()}
                        disabled={busy}
                        className={cn('btn-secondary min-h-12 px-6 tv-focus', busy && 'opacity-60')}
                      >
                        {busy ? 'Generando…' : 'Nuevo código'}
                      </button>
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={() => {
                          setAuthError('');
                          setPanel('email');
                        }}
                        className="btn-primary min-h-12 px-6 tv-focus"
                      >
                        Entrar con correo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form
                className="rounded-2xl border border-cinema-border bg-cinema-elevated/80 p-6 md:p-8 space-y-4"
                onSubmit={(event) => void submitEmail(event)}
                noValidate
              >
                <h2 className="font-display text-3xl tracking-tight">Entrar con correo</h2>
                <p className="text-cinema-muted text-sm leading-relaxed">
                  La misma cuenta de la web. El código QR sigue disponible.
                </p>
                <div>
                  <label htmlFor="tv-login-email" className="block text-sm text-cinema-ash mb-1.5">
                    Correo
                  </label>
                  <input
                    id="tv-login-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    tabIndex={0}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="tv-focus w-full min-h-12 rounded-[10px] border border-cinema-border bg-cinema-surface px-4 text-lg text-cinema-chalk"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tv-login-password"
                    className="block text-sm text-cinema-ash mb-1.5"
                  >
                    Contraseña
                  </label>
                  <input
                    id="tv-login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    tabIndex={0}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="tv-focus w-full min-h-12 rounded-[10px] border border-cinema-border bg-cinema-surface px-4 text-lg text-cinema-chalk"
                  />
                </div>
                {authError ? (
                  <p className="text-sm text-cinema-danger-light" role="alert">
                    {authError}
                  </p>
                ) : null}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="submit"
                    tabIndex={0}
                    disabled={authBusy}
                    className={cn('btn-primary min-h-12 px-6 tv-focus', authBusy && 'opacity-60')}
                  >
                    {authBusy ? 'Entrando…' : 'Entrar'}
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => setPanel('qr')}
                    className="btn-secondary min-h-12 px-6 tv-focus"
                  >
                    Volver al código QR
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
