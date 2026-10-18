import { NextResponse } from 'next/server';
import { AuthError, issueTvSession, signInWithGoogleIdToken } from '@pelis/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Login nativo con Google (Credential Manager) — paso 2.
 * Body: { idToken }. Verifica el ID token de Google (firma, iss, aud = client id
 * web, exp, nonce de un solo uso, email_verified) y crea la sesión igual que
 * /api/app-auth/exchange.
 */
export async function POST(req: Request) {
  let body: { idToken?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const { userId } = await signInWithGoogleIdToken({ idToken: body.idToken });
    const issued = await issueTvSession(userId, req);
    const res = NextResponse.json(
      { ok: true, cookieName: issued.cookieName, cookieValue: issued.cookieValue },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    res.cookies.set({
      name: issued.cookieName,
      value: issued.cookieValue,
      httpOnly: true,
      sameSite: 'lax',
      secure: issued.secure,
      path: '/',
      maxAge: issued.maxAge,
    });
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[app-auth/google/id-token] failed', err);
    return NextResponse.json({ error: 'No se pudo iniciar sesión con Google' }, { status: 500 });
  }
}
