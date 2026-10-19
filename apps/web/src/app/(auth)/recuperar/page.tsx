'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Input } from '@pelis/ui/components';
import { authClient } from '@pelis/auth/client';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Escribe un correo válido');
      return;
    }
    setLoading(true);
    try {
      const { error: reqError } = await authClient.requestPasswordReset({
        email: trimmed,
        redirectTo: '/restablecer',
      });
      if (reqError?.status === 429) {
        setError('Demasiados intentos. Espera un minuto y vuelve a probar.');
        return;
      }
      // Respuesta genérica: no revelamos si el correo tiene cuenta.
      setSent(true);
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
          <p className="text-label uppercase text-cinema-accent mb-3">Recuperar acceso</p>
          <h1 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-cinema-chalk">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-cinema-muted mt-2">
            Escribe tu correo y te enviaremos un enlace para elegir una nueva.
          </p>
        </div>

        {sent ? (
          <div
            className="mb-4 p-4 rounded bg-cinema-success/10 border border-cinema-success/30 text-cinema-success text-sm text-center"
            role="status"
          >
            Si hay una cuenta con ese correo, te enviamos un enlace. Revisa tu bandeja de entrada (y
            la carpeta de spam). El enlace vence en 1 hora.
          </div>
        ) : (
          <>
            {error && (
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
                autoComplete="email"
                placeholder="nombre@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar enlace'}
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
