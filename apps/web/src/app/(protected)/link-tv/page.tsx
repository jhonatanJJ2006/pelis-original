'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Tv } from 'lucide-react';
import { useUser } from '@pelis/auth/hooks';
import { Button, Input } from '@pelis/ui/components';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { normalizePairingCode } from '@pelis/db/tv-pairing-code';

function LinkTvForm() {
  const { user, isLoading } = useUser();
  const searchParams = useSearchParams();
  const preset = searchParams.get('code') ?? '';
  const [code, setCode] = useState(preset);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preset) setCode(preset);
  }, [preset]);

  if (isLoading) {
    return (
      <div className="page-shell max-w-lg mx-auto">
        <p className="text-cinema-muted">Cargando…</p>
      </div>
    );
  }

  if (!user) {
    const next = `/link-tv${preset ? `?code=${encodeURIComponent(preset)}` : ''}`;
    return (
      <EmptyState
        icon={Tv}
        title="Vincular televisor"
        description="Inicia sesión en el celular o en la web para aprobar el código que ves en la tele."
        actionLabel="Iniciar sesión"
        actionHref={`/login?next=${encodeURIComponent(next)}`}
      />
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setOk(false);
    const normalized = normalizePairingCode(code);
    if (normalized.length < 6) {
      setError('Escribe el código de 6 caracteres que ves en la tele.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/tv-auth/approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || 'No se pudo vincular. Revisa el código.');
        return;
      }
      setOk(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell max-w-5xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cinema-accent/40 bg-cinema-accent/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cinema-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
          Sincronización de salón
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-cinema-chalk mb-3">
          Vincular televisor
        </h1>
        <p className="text-cinema-muted leading-relaxed">
          Escribe el código de la pantalla de Pelis en tu Android TV. Al confirmar, la tele entra
          con tu misma sesión.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="border border-cinema-border/70 bg-cinema-surface p-6 md:p-8 rounded-[2px]">
          <h2 className="font-display text-xl text-cinema-chalk mb-6">
            Instrucciones de vinculación
          </h2>
          <ol className="space-y-5">
            {[
              ['Abre PELIS en tu Android TV', 'Inicia la aplicación en tu televisor.'],
              [
                'Muestra el código de vinculación',
                'En la pantalla de acceso de la tele aparece un código de 6 caracteres.',
              ],
              ['Introduce el código aquí', 'Escríbelo en el formulario y confirma.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cinema-accent/50 font-display text-cinema-accent">
                  {i + 1}
                </span>
                <div>
                  <p className="text-cinema-chalk font-medium">{title}</p>
                  <p className="text-sm text-cinema-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div>
          {ok ? (
            <div className="border border-cinema-accent/40 bg-cinema-surface p-6 md:p-8 rounded-[2px]">
              <p className="text-cinema-chalk font-semibold mb-2">Televisor vinculado</p>
              <p className="text-cinema-muted text-sm leading-relaxed">
                Vuelve a la tele. En unos segundos debe abrir los canales en vivo.
              </p>
              <Link href="/tv" className="btn-primary mt-6 inline-flex min-h-11 px-5">
                Ir a TV en vivo
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="border border-cinema-border/70 bg-cinema-surface p-6 md:p-8 space-y-5 rounded-[2px]"
            >
              <p className="text-label uppercase text-cinema-accent">Terminal de autorización</p>
              <Input
                label="Código de 6 caracteres"
                value={code}
                onChange={(event) => setCode(normalizePairingCode(event.target.value))}
                placeholder="ABC234"
                autoComplete="one-time-code"
                inputMode="text"
                maxLength={6}
              />
              {error ? (
                <p className="text-sm text-cinema-danger-light" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? 'Vinculando…' : 'Vincular este televisor'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LinkTvPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell max-w-lg mx-auto">
          <h1 className="font-display text-3xl text-cinema-chalk">Vincular televisor</h1>
        </div>
      }
    >
      <LinkTvForm />
    </Suspense>
  );
}
