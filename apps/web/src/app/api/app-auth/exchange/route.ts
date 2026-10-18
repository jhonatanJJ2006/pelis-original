import { NextResponse } from 'next/server';
import { AuthError, exchangeAppAuthCode, issueTvSession } from '@pelis/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Canje del código de un solo uso de la app nativa (login con Google).
 * Body: { code, state, verifier }. Crea la sesión igual que /api/tv-auth/claim.
 */
export async function POST(req: Request) {
  let body: { code?: unknown; state?: unknown; verifier?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const { userId } = await exchangeAppAuthCode({
      code: body.code,
      state: body.state,
      verifier: body.verifier,
    });
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
    return NextResponse.json({ error: 'No se pudo completar el acceso' }, { status: 500 });
  }
}
