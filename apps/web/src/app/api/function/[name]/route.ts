/**
 * Generic function-invocation endpoint.
 *
 * POST /api/function/<name>  →  invoke the function with the JSON body as args.
 * Used by useQuery / useMutation / useAction client hooks.
 */

import { NextResponse } from 'next/server';
import { getRequestCtx } from '@pelis/db/server';
import { invoke } from '@pelis/db';
import { getDefinition } from '@pelis/db/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { name: string } },
) {
  const name = decodeURIComponent(params.name);
  const def = getDefinition(name);
  if (!def) {
    return NextResponse.json({ error: `Function "${name}" not found` }, { status: 404 });
  }

  let args: unknown = {};
  try {
    args = await req.json();
  } catch {
    // empty body is ok
  }

  const ctx = await getRequestCtx(req);

  try {
    const data = await invoke({ name, args, ctx });
    return NextResponse.json(data ?? null);
  } catch (err) {
    const status = err && typeof err === 'object' && 'status' in err
      ? Number((err as { status: number }).status) || 500
      : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}