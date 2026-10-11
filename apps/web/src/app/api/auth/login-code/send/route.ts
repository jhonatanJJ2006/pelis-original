import { NextResponse } from 'next/server';
import {
  checkLoginCodeRateLimit,
  isValidEmail,
  loginCodeRateLimiter,
} from '@/lib/login-code-rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'desconocida'
  );
}

/**
 * Pide un código de acceso por correo (inicio de sesión sin contraseña).
 * Responde igual exista o no la cuenta, para no revelar qué correos están registrados.
 * El código se valida después con POST /api/auth/sign-in/email-otp (Better Auth).
 */
export async function POST(req: Request) {
  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    // cuerpo vacío
  }
  const email = String(body.email ?? '')
    .toLowerCase()
    .trim();
  if (!isValidEmail(email)) {
    return NextResponse.json({ message: 'Correo inválido' }, { status: 400 });
  }

  const ip = clientIp(req);
  let limit;
  try {
    limit = await checkLoginCodeRateLimit(email, ip);
  } catch (err) {
    // Si Postgres falla, no dejamos el envío sin límite: usamos el de memoria.
    console.error('[login-code] límite en Postgres no disponible', err);
    limit = loginCodeRateLimiter.check(email, ip);
  }
  if (!limit.ok) {
    return NextResponse.json(
      {
        message: `Espera ${limit.retryAfterSec} segundos antes de pedir otro código`,
        retryAfterSec: limit.retryAfterSec,
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  try {
    const { auth } = await import('@pelis/db/auth');
    // Las opciones de auth están tipadas como BetterAuthOptions, así que el tipo del
    // endpoint del plugin emailOTP no se infiere; existe en tiempo de ejecución.
    const api = auth().api as unknown as {
      sendVerificationOTP: (input: {
        body: { email: string; type: 'sign-in' };
      }) => Promise<unknown>;
    };
    await api.sendVerificationOTP({ body: { email, type: 'sign-in' } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[login-code] envío fallido', err);
    return NextResponse.json({ message: 'No pudimos enviar el código' }, { status: 500 });
  }
}
