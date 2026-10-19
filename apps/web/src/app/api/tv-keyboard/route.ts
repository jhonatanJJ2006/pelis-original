import { NextResponse } from 'next/server';
import {
  buildTvKeyboardUrl,
  createTvKeyboardSession,
  formatPairingCode,
  getTvKeyboardSession,
} from '@pelis/db';
import { resolveRequestOrigin } from '../../../lib/request-origin';
import { clientIp } from '../../../lib/tv-keyboard-limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/** La TV abre una sesión de teclado al entrar en Buscar. */
export async function POST(req: Request) {
  try {
    const res = await createTvKeyboardSession(clientIp(req));
    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Demasiados códigos. Intenta de nuevo más tarde.',
          retryAfterSec: res.retryAfterSec,
        },
        { status: 429, headers: { ...noStore, 'Retry-After': String(res.retryAfterSec) } }
      );
    }
    return NextResponse.json(
      {
        code: res.code,
        displayCode: formatPairingCode(res.code),
        url: buildTvKeyboardUrl(resolveRequestOrigin(req), res.code),
        expiresAt: res.expiresAt.toISOString(),
      },
      { headers: noStore }
    );
  } catch {
    return NextResponse.json(
      { error: 'No se pudo crear el código' },
      { status: 500, headers: noStore }
    );
  }
}

/**
 * La TV pregunta cada segundo. Con `v` igual a la versión guardada solo
 * devuelve `{ v }`, para gastar lo mínimo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') ?? '';
  const since = Number(url.searchParams.get('v') ?? '-1');
  const row = await getTvKeyboardSession(code);
  if (!row) {
    return NextResponse.json(
      { error: 'Código vencido', expired: true },
      { status: 404, headers: noStore }
    );
  }
  if (row.version === since) {
    return NextResponse.json({ v: row.version }, { headers: noStore });
  }
  return NextResponse.json(
    { v: row.version, text: row.text, done: row.done },
    { headers: noStore }
  );
}
