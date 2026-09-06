import { NextResponse } from 'next/server';
import { AuthError, approveTvPairing, getRequestCtx } from '@pelis/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getRequestCtx(req);
  if (!ctx.userId) {
    return NextResponse.json({ error: 'Inicia sesión para vincular la tele' }, { status: 401 });
  }

  let body: { code?: string } = {};
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    body = {};
  }

  try {
    const row = await approveTvPairing({ code: body.code ?? '', userId: ctx.userId });
    return NextResponse.json({
      ok: true,
      status: 'approved',
      expiresAt: row.expiresAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'No se pudo aprobar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
