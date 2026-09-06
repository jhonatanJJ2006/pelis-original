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
    <div className="page-shell max-w-lg mx-auto">
      <p className="text-cinema-accent text-xs font-medium uppercase tracking-widest mb-2">
        Dispositivos
      </p>
      <h1 className="font-display text-3xl md:text-4xl tracking-tight text-cinema-chalk mb-3">
        Vincular televisor
      </h1>
      <p className="text-cinema-muted text-sm leading-relaxed mb-8">
        Escribe el código de la pantalla de Pelis en tu Android TV. Al confirmar, la tele entra con
        tu misma sesión.
      </p>

      {ok ? (
        <div className="rounded-2xl border border-cinema-border bg-cinema-surface p-6">
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
          className="rounded-2xl border border-cinema-border bg-cinema-surface p-6 space-y-4"
        >
          <Input
            label="Código de la tele"
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
