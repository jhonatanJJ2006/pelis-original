'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@pelis/auth/client';

// Mismo formato que valida el servidor (base64url, 43–128 caracteres).
const TOKEN_RE = /^[A-Za-z0-9_-]{43,128}$/;

/**
 * Inicio del login con Google de la app nativa (se abre en una Custom Tab).
 * Siempre pasa por Google; al volver, /api/app-auth/google/complete emite el
 * código de un solo uso y regresa a la app.
 */
function AppGoogleLogin() {
  const params = useSearchParams();
  const state = params.get('state') ?? '';
  const challenge = params.get('challenge') ?? '';
  const valid = TOKEN_RE.test(state) && TOKEN_RE.test(challenge);
  const returnedWithError = Boolean(params.get('error'));
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (!valid || returnedWithError || started.current) return;
    started.current = true;
    const qs = new URLSearchParams({ state, challenge }).toString();
    authClient.signIn
      .social({
        provider: 'google',
        callbackURL: `/api/app-auth/google/complete?${qs}`,
        errorCallbackURL: `/app-auth/google?${qs}&error=1`,
      })
      .then(({ error: googleError }) => {
        if (googleError) setError(googleError.message || 'No se pudo abrir Google');
      })
      .catch(() => setError('Error de conexión con Google. Intenta de nuevo.'));
  }, [valid, returnedWithError, state, challenge]);

  const failed = !valid || returnedWithError || Boolean(error);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center bg-cinema-bg">
      <span className="font-display text-3xl font-semibold tracking-[0.12em] text-cinema-accent">
        PELIS
      </span>
      {failed ? (
        <p className="text-cinema-muted max-w-sm">
          {!valid
            ? 'Enlace inválido. Vuelve a la app e inténtalo de nuevo.'
            : error ||
              'No se completó el inicio de sesión con Google. Vuelve a la app e inténtalo de nuevo.'}
        </p>
      ) : (
        <p className="text-cinema-muted">Abriendo Google…</p>
      )}
    </main>
  );
}

export default function AppGoogleLoginPage() {
  return (
    <Suspense fallback={null}>
      <AppGoogleLogin />
    </Suspense>
  );
}
