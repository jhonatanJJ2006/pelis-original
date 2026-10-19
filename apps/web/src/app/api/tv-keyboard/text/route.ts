import { NextResponse } from 'next/server';
import { updateTvKeyboardText } from '@pelis/db';
import {
  MAX_BODY_BYTES,
  SlidingWindowLimiter,
  TYPE_BURST,
  TYPE_WINDOW_MS,
  clientIp,
} from '../../../../lib/tv-keyboard-limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new SlidingWindowLimiter(TYPE_BURST, TYPE_WINDOW_MS);
const noStore = { 'Cache-Control': 'no-store' };

/** El celular manda el texto de la búsqueda. No hace falta iniciar sesión. */
export async function POST(req: Request) {
  if (!limiter.allow(clientIp(req))) {
    return NextResponse.json(
      { error: 'Vas muy rápido. Espera un momento.' },
      { status: 429, headers: { ...noStore, 'Retry-After': '5' } }
    );
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Texto demasiado largo' }, { status: 413, headers: noStore });
  }
  let body: { code?: unknown; text?: unknown; done?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Datos no válidos' }, { status: 400, headers: noStore });
  }
  const res = await updateTvKeyboardText(
    typeof body.code === 'string' ? body.code : '',
    body.text,
    body.done === true
  );
  if (res.ok) return NextResponse.json({ ok: true, v: res.version }, { headers: noStore });
  if (res.reason === 'invalid') {
    return NextResponse.json({ error: 'Datos no válidos' }, { status: 400, headers: noStore });
  }
  if (res.reason === 'not_found') {
    return NextResponse.json(
      { error: 'Este código venció. Vuelve a abrir Buscar en tu TV.', expired: true },
      { status: 404, headers: noStore }
    );
  }
  return NextResponse.json(
    { error: 'Se alcanzó el límite de este código. Vuelve a abrir Buscar en tu TV.' },
    { status: 429, headers: noStore }
  );
}
