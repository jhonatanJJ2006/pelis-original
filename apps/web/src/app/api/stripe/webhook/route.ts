/**
 * Stripe webhook receiver. Replaces packages/convex/src/http.ts webhook.
 *
 * Stripe → POST /api/stripe/webhook → invoke stripeWebhookAction.processWebhook
 */

import { NextResponse } from 'next/server';
import { invoke } from '@pelis/db';
import { getDefinition } from '@pelis/db/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new NextResponse('Missing stripe-signature header', { status: 400 });
  }
  const def = getDefinition('stripeWebhookAction.processWebhook');
  if (!def) {
    return NextResponse.json({ error: 'Stripe webhook handler not registered' }, { status: 500 });
  }
  try {
    const result = (await invoke({
      name: 'stripeWebhookAction.processWebhook',
      args: { body, signature },
      ctx: { userId: null, isAdmin: false },
    })) as { ok: boolean; status: number; message?: string };
    if (!result.ok) {
      return new NextResponse(result.message ?? 'Webhook error', { status: result.status });
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new NextResponse(message, { status: 500 });
  }
}
