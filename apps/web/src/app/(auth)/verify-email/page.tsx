'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Film } from 'lucide-react';
import { Button } from '@pelis/ui/components';
const getAuthApiBase = () => '/api/auth';
import { useState, useEffect, Suspense } from 'react';

const OTP_LENGTH = 6;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  if (!emailFromUrl) {
    return (
      <div className="w-full max-w-md">
        <div className="card-glow p-6 md:p-8 shadow-[0_8px_40px_rgba(59,130,246,0.15)] text-center">
          <h1 className="font-display text-2xl tracking-wide text-white uppercase mb-4">
            Enlace inválido
          </h1>
          <p className="text-cinema-muted mb-6">No se ha proporcionado un correo electrónico.</p>
          <Link
            href="/register"
            className="text-cinema-gold hover:text-cinema-gold-light font-medium"
          >
            Volver al registro
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== OTP_LENGTH) {
      setError(`El código debe tener ${OTP_LENGTH} dígitos`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${getAuthApiBase()}/email-otp/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailFromUrl, otp }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || 'Código inválido o expirado');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/login?verified=true`);
        router.refresh();
      }, 1000);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      const res = await fetch(`${getAuthApiBase()}/email-otp/send-verification-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailFromUrl, type: 'email-verification' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const match = String(data?.message ?? '').match(/(\d+)\s*segundos/);
          if (match) {
            setResendCooldown(Math.max(1, Math.min(30, parseInt(match[1], 10))));
            setError('');
            return;
          }
        }
        setError(data?.message || 'Error al reenviar el código');
        return;
      }

      setError('');
      setResendCooldown(30);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = emailFromUrl.replace(
    /(.{2})(.*)(@.*)/,
    (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c
  );

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="card-glow p-6 md:p-8 shadow-[0_8px_40px_rgba(59,130,246,0.15)] text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wide text-white uppercase mb-2">
            ¡Cuenta verificada!
          </h1>
          <p className="text-cinema-muted">Te estamos redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="card-glow p-6 md:p-8 shadow-[0_8px_40px_rgba(59,130,246,0.15)]">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-cinema-violet to-cinema-teal rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow-violet">
            <Film className="w-8 h-8 text-white" aria-hidden />
          </div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wide text-white uppercase">
            Verifica tu email
          </h1>
          <p className="text-cinema-muted mt-2">
            Hemos enviado un código de verificación a<br />
            <span className="text-white font-medium">{maskedEmail}</span>
          </p>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
            role="alert"
          >
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleVerify}>
          <div>
            <label className="block text-sm font-medium text-cinema-muted mb-2 text-center">
              Código de verificación
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
              className="w-full bg-cinema-surface border border-cinema-border rounded-[10px] py-4 px-4 text-white text-center text-2xl sm:text-3xl font-mono tracking-[0.3em] sm:tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-cinema-accent/50 focus:border-cinema-accent/60 transition-all duration-200 placeholder-cinema-ash/40"
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || otp.length !== OTP_LENGTH}
          >
            {loading ? 'Verificando…' : 'Verificar cuenta'}
          </Button>
        </form>

        <div className="text-center mt-6">
          <p className="text-cinema-muted text-sm mb-3">¿No recibiste el código?</p>
          <div className="relative inline-flex items-center justify-center">
            {resendCooldown > 0 && (
              <svg className="absolute w-20 h-20 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="rgba(139,92,246,0.15)"
                  strokeWidth="3"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="url(#timerGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - resendCooldown / 30)}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="timerGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
            )}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="relative text-cinema-gold hover:text-cinema-gold-light font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? 'Reenviando…'
                : resendCooldown > 0
                  ? `${resendCooldown}s`
                  : 'Reenviar código'}
            </button>
          </div>
        </div>

        <p className="text-center text-cinema-muted text-sm mt-6 pt-6 border-t border-cinema-border">
          <Link href="/login" className="text-cinema-gold hover:text-cinema-gold-light font-medium">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
