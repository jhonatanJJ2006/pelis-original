import { NextResponse } from 'next/server';
import { AuthError, claimTvPairing, issueTvSession } from '@pelis/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { code?: string; deviceId?: string } = {};
  try {
    body = (await req.json()) as { code?: string; deviceId?: string };
  } catch {
    body = {};
  }

  try {
    const row = await claimTvPairing({ code: body.code ?? '', deviceId: body.deviceId ?? '' });
    if (!row.userId) {
      return NextResponse.json({ error: 'El emparejamiento no tiene usuario' }, { status: 409 });
    }
    const issued = await issueTvSession(row.userId, req);
    const res = NextResponse.json({
      ok: true,
      status: 'claimed',
      token: issued.token,
      cookieName: issued.cookieName,
      // Valor firmado listo para clientes nativos que guardan la cookie manualmente.
      cookieValue: issued.cookieValue,
    });
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
    const message = err instanceof Error ? err.message : 'No se pudo completar el acceso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
