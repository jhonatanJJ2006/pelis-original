'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button, Input } from '@pelis/ui/components';
import { authClient } from '@pelis/auth/client';
import { OtpBoxes } from '@/components/otp-boxes';

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function CodeLoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login-code/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        retryAfterSec?: number;
      };
      if (!res.ok) {
        if (data.retryAfterSec) setCooldown(data.retryAfterSec);
        setError(data.message || 'No pudimos enviar el código');
        return;
      }
      setStep('code');
      setCode('');
      setCooldown(60);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (otp: string) => {
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp,
      });
      if (signInError) {
        const msg = (signInError.message || '').toLowerCase();
        setError(
          msg.includes('expired')
            ? 'El código venció. Pide uno nuevo.'
            : msg.includes('too many')
              ? 'Demasiados intentos. Pide un código nuevo.'
              : 'Código incorrecto o vencido.'
        );
        setCode('');
        return;
      }
      await authClient.getSession({ query: { disableCookieCache: true } });
      window.location.assign(nextPath || '/');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const onCodeChange = (v: string) => {
    setCode(v);
    if (v.length === 6 && !loading) void verify(v);
  };

  return (
    <div className="w-full max-w-md">
      <div className="card-glow p-6 md:p-8">
        <p className="text-label uppercase text-cinema-accent mb-2">
          {step === 'email' ? 'Acceso sin contraseña' : 'Paso 2 de 2'}
        </p>
        <h1 className="font-display text-3xl font-semibold text-cinema-chalk mb-2">
          {step === 'email' ? 'Entra con un código' : 'Revisa tu correo'}
        </h1>
        <p className="text-cinema-muted text-sm mb-6">
          {step === 'email' ? (
            'Te enviaremos un código de 6 dígitos al correo de tu cuenta.'
          ) : (
            <>
              Escribe el código que enviamos a{' '}
              <span className="text-cinema-chalk font-medium">{email}</span>. Vence en 10 minutos.
            </>
          )}
        </p>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-[6px] border border-cinema-danger/60 bg-cinema-danger/10 px-3 py-2 text-sm text-cinema-chalk"
          >
            {error}
          </p>
        )}

        {step === 'email' ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void requestCode();
            }}
          >
            <Input
              type="email"
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
            <Button type="submit" className="w-full" size="lg" disabled={loading || cooldown > 0}>
              {loading ? 'Enviando…' : cooldown > 0 ? `Espera ${cooldown} s` : 'Enviarme el código'}
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <OtpBoxes value={code} onChange={onCodeChange} disabled={loading} autoFocus />
            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={loading || code.length !== 6}
              onClick={() => void verify(code)}
            >
              {loading ? 'Verificando…' : 'Entrar'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-cinema-muted hover:text-cinema-chalk"
                onClick={() => {
                  setStep('email');
                  setError('');
                }}
              >
                Cambiar correo
              </button>
              <button
                type="button"
                className="text-cinema-accent hover:text-cinema-accent-light disabled:text-cinema-ash"
                disabled={loading || cooldown > 0}
                onClick={() => void requestCode()}
              >
                {cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Reenviar código'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-cinema-muted text-sm mt-6">
          <Link
            href="/login"
            className="text-cinema-accent hover:text-cinema-accent-light font-medium"
          >
            Entrar con contraseña o Google
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CodeLoginPage() {
  return (
    <Suspense fallback={null}>
      <CodeLoginForm />
    </Suspense>
  );
}
