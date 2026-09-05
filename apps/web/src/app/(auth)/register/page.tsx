'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Film } from 'lucide-react';
import { Button, Input } from '@pelis/ui/components';
const getAuthApiBase = () => '/api/auth';
import { authClient } from '@pelis/auth/client';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const translateError = (message: string): string => {
    const translations: Record<string, string> = {
      'User already exists. Use another email.': 'El usuario ya existe. Usa otro correo electrónico.',
      'User already exists.': 'El usuario ya existe.',
      'Invalid email': 'El email no es válido',
      'Password too short': 'La contraseña es demasiado corta',
      'Password too long': 'La contraseña es demasiado larga',
      'Email and password sign up is not enabled':
        'El registro con email no está habilitado en este momento',
    };
    return translations[message] ?? message;
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: googleError } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
      if (googleError) {
        setError(googleError.message || 'No se pudo continuar con Google');
      }
    } catch {
      setError('Error de conexión con Google. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${getAuthApiBase()}/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(translateError(data?.message || 'Error al crear la cuenta'));
        return;
      }
      try {
        await fetch(`${getAuthApiBase()}/email-otp/send-verification-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type: 'email-verification' }),
        });
      } catch {
        // El usuario puede reenviar el código desde la página de verificación.
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="card-glow p-6 md:p-8 shadow-[0_8px_40px_rgba(196,163,90,0.12)]">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-cinema-accent to-cinema-gold rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Film className="w-8 h-8 text-cinema-bg" aria-hidden />
          </div>
          <h1 className="font-display text-2xl md:text-3xl tracking-tight text-cinema-chalk">
            Crear cuenta
          </h1>
          <p className="text-cinema-muted mt-2">Únete a Pelis y disfruta del streaming</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 h-11 px-4 bg-cinema-elevated hover:bg-cinema-elevated/90 text-white font-semibold border border-cinema-border hover:border-cinema-silver/40 rounded-[10px] transition-all duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              o con email
            </span>
          </div>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded bg-cinema-danger/10 border border-cinema-danger/30 text-cinema-danger-light text-sm text-center"
            role="alert"
          >
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Nombre"
            type="text"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="text-center text-cinema-muted text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-cinema-gold hover:text-cinema-gold-light font-medium">
            Inicia sesión
          </Link>
        </p>

        <p className="text-center text-cinema-ash text-xs mt-4 leading-relaxed">
          Al crear una cuenta aceptas los{' '}
          <Link href="/terminos" className="text-cinema-gold hover:text-cinema-gold-light underline">
            Términos
          </Link>{' '}
          y la{' '}
          <Link href="/privacidad" className="text-cinema-gold hover:text-cinema-gold-light underline">
            Privacidad
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
