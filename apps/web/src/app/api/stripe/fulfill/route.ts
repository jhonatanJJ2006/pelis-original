/**
 * Same-origin fulfill after Stripe redirects back to verpelis.pro (Movies tunnel).
 * Does not require a session cookie — Checkout session_id + Stripe metadata is enough.
 */

import { NextResponse } from 'next/server';
import { invoke } from '@pelis/db';
import { getDefinition } from '@pelis/db/registry';
import { getRequestCtx } from '@pelis/db/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let sessionId = '';
  try {
    const body = (await req.json()) as { sessionId?: unknown };
    sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  } catch {
    sessionId = '';
  }
  if (!sessionId) {
    return NextResponse.json({ error: 'Falta session_id' }, { status: 400 });
  }
  const def = getDefinition('stripe.syncCheckoutSession');
  if (!def) {
    return NextResponse.json({ error: 'Fulfill handler not registered' }, { status: 500 });
  }
  try {
    const ctx = await getRequestCtx(req);
    const result = (await invoke({
      name: 'stripe.syncCheckoutSession',
      args: { sessionId },
      ctx,
    })) as { activated: boolean; planExpiresAt?: number };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    const status = message.includes('No autenticado')
      ? 401
      : message.includes('no pertenece')
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
