'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button, Input } from '@pelis/ui/components';
import { authClient } from '@pelis/auth/client';

const MIN_LENGTH = 8;

function RestablecerForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const linkError = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (resetError) {
        setError(
          resetError.status === 429
            ? 'Demasiados intentos. Espera un minuto y vuelve a probar.'
            : 'El enlace no es válido o ya venció. Pide uno nuevo.'
        );
        return;
      }
      setDone(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const invalidLink = !token || !!linkError;

  return (
    <div className="w-full max-w-md">
      <div className="card-glow auth-card p-6 md:p-10">
        <div className="text-center mb-8">
          <p className="text-label uppercase text-cinema-accent mb-3">Recuperar acceso</p>
          <h1 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-cinema-chalk">
            Elige una nueva contraseña
          </h1>
        </div>

        {done ? (
          <>
            <div
              className="mb-4 p-4 rounded bg-cinema-success/10 border border-cinema-success/30 text-cinema-success text-sm text-center"
              role="status"
            >
              Listo, tu contraseña cambió. Ya puedes iniciar sesión con la nueva.
            </div>
            <Link
              href="/login"
              className="btn-primary flex h-11 w-full items-center justify-center rounded-[6px] text-sm font-semibold"
            >
              Iniciar sesión
            </Link>
          </>
        ) : invalidLink ? (
          <>
            <div
              className="mb-4 p-4 rounded bg-cinema-danger/10 border border-cinema-danger/30 text-cinema-danger-light text-sm text-center"
              role="alert"
            >
              El enlace no es válido o ya venció. Pide uno nuevo.
            </div>
            <Link
              href="/recuperar"
              className="btn-primary flex h-11 w-full items-center justify-center rounded-[6px] text-sm font-semibold"
            >
              Pedir un enlace nuevo
            </Link>
          </>
        ) : (
          <>
            {error && (
              <div
                className="mb-4 p-3 rounded bg-cinema-danger/10 border border-cinema-danger/30 text-cinema-danger-light text-sm text-center"
                role="alert"
              >
                {error}{' '}
                {error.includes('venció') && (
                  <Link href="/recuperar" className="underline">
                    Pedir otro
                  </Link>
                )}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <Input
                label="Nueva contraseña"
                type="password"
                autoComplete="new-password"
                placeholder="Al menos 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Repite la contraseña"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          </>
        )}

        <p className="text-center text-cinema-muted text-sm mt-6">
          <Link
            href="/login"
            className="text-cinema-accent hover:text-cinema-accent-light font-medium"
          >
            ← Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RestablecerPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md" />}>
      <RestablecerForm />
    </Suspense>
  );
}
