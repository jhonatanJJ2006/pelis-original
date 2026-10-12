'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input } from '@pelis/ui/components';
const getAuthApiBase = () => '/api/auth';
import { authClient } from '@pelis/auth/client';
import { useState, useEffect, Suspense } from 'react';
import { useIsTvDevice } from '@/hooks/use-is-tv-device';
import { TvLoginScreen } from '@/components/tv-login-screen';

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const nextPath = safeNextPath(searchParams.get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerifyMessage, setShowVerifyMessage] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: googleError } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: nextPath || '/',
      });
      if (googleError) {
        setError(googleError.message || 'No se pudo iniciar sesión con Google');
      }
    } catch {
      setError('Error de conexión con Google. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setResendMessage('');
    try {
      const res = await fetch(`${getAuthApiBase()}/email-otp/send-verification-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'email-verification' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResendMessage(data?.message || 'Error al reenviar el código');
        return;
      }
      setResendMessage('Código enviado. Revisa tu bandeja de entrada.');
      setResendCooldown(30);
    } catch {
      setResendMessage('Error de conexión. Intenta de nuevo.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowVerifyMessage(false);
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });
      if (signInError) {
        const message = signInError.message || 'Credenciales inválidas';
        if (message.toLowerCase().includes('verify') || message.toLowerCase().includes('email')) {
          setShowVerifyMessage(true);
        }
        setError(message);
        return;
      }
      await authClient.getSession({ query: { disableCookieCache: true } });
      // Hard navigation so cookies/session are picked up reliably after sign-in.
      window.location.assign(nextPath || '/');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="card-glow auth-card p-6 md:p-10">
        <div className="text-center mb-8">
          <p className="text-label uppercase text-cinema-accent mb-3 inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-cinema-accent" aria-hidden />
            Sala de proyección privada
            <span className="h-1 w-1 rounded-full bg-cinema-accent" aria-hidden />
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-cinema-chalk">
            Acceso a tu sala de proyección
          </h1>
          <p className="text-cinema-muted mt-2">Accede a tu cuenta para continuar</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 h-11 px-4 bg-cinema-elevated hover:bg-cinema-elevated/90 text-cinema-chalk font-semibold border border-cinema-border hover:border-cinema-silver/40 rounded-[6px] transition-all duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-cinema-border/70" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-cinema-surface px-3 text-[11px] text-cinema-ash uppercase tracking-widest">
              o
            </span>
          </div>
        </div>

        {verified && (
          <div
            className="mb-4 p-3 rounded bg-cinema-success/10 border border-cinema-success/30 text-cinema-success text-sm text-center"
            role="alert"
          >
            ¡Email verificado! Ahora puedes iniciar sesión.
          </div>
        )}

        {showVerifyMessage && (
          <div className="mb-4 p-3 rounded bg-cinema-accent/10 border border-cinema-accent/30 text-cinema-accent text-sm text-center">
            <p className="mb-2">Debes verificar tu email antes de iniciar sesión.</p>
            {resendMessage && (
              <p
                className={`mb-2 ${resendCooldown > 0 ? 'text-cinema-accent-light' : 'text-red-400'}`}
              >
                {resendMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending || resendCooldown > 0}
              className="text-cinema-accent-light hover:text-cinema-accent-light underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? 'Reenviando…'
                : resendCooldown > 0
                  ? `Vuelve a intentarlo en ${resendCooldown}s`
                  : 'Reenviar código de verificación'}
            </button>
            <p className="mt-3 pt-3 border-t border-cinema-accent/20">
              ¿Ya tienes tu código?{' '}
              <Link
                href={`/verify-email?email=${encodeURIComponent(email)}`}
                className="text-cinema-accent-light hover:text-cinema-chalk underline font-medium"
              >
                Ingresa tu código de verificación
              </Link>
            </p>
          </div>
        )}

        {error && !showVerifyMessage && (
          <div
            className="mb-4 p-3 rounded bg-cinema-danger/10 border border-cinema-danger/30 text-cinema-danger-light text-sm text-center"
            role="alert"
          >
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="nombre@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
        </form>

        <Link
          href={nextPath ? `/login/codigo?next=${encodeURIComponent(nextPath)}` : '/login/codigo'}
          className="btn-base mt-3 flex h-11 w-full items-center justify-center rounded-[6px] border border-cinema-border text-sm font-medium text-cinema-chalk hover:border-cinema-accent hover:text-cinema-accent"
        >
          Entrar con un código por correo
        </Link>

        <p className="text-center text-cinema-muted text-sm mt-6">
          ¿No tienes cuenta?{' '}
          <Link
            href="/register"
            className="text-cinema-accent hover:text-cinema-accent-light font-medium"
          >
            Regístrate
          </Link>
        </p>

        <p className="text-center text-cinema-ash text-xs mt-4 leading-relaxed">
          Al continuar aceptas los{' '}
          <Link
            href="/terminos"
            className="text-cinema-accent hover:text-cinema-accent-light underline"
          >
            Términos
          </Link>{' '}
          y la{' '}
          <Link
            href="/privacidad"
            className="text-cinema-accent hover:text-cinema-accent-light underline"
          >
            Privacidad
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="card-glow auth-card p-6 md:p-10">
        <div className="text-center mb-8">
          <p className="text-label uppercase text-cinema-accent mb-3 inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-cinema-accent" aria-hidden />
            Sala de proyección privada
            <span className="h-1 w-1 rounded-full bg-cinema-accent" aria-hidden />
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-cinema-chalk">
            Iniciar sesión
          </h1>
        </div>
      </div>
    </div>
  );
}

function LoginSwitch() {
  const isTv = useIsTvDevice();
  if (isTv) return <TvLoginScreen />;
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginSwitch />
    </Suspense>
  );
}
