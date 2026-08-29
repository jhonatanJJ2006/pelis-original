import { NextResponse } from 'next/server';
import { AuthError, requireActivePlan } from '@pelis/db';
import { getRequestCtx } from '@pelis/db/server';

/**
 * Session + active plan (or ADMIN) before any stream bytes.
 * Unauthenticated → 401, no plan → 403.
 */
export async function denyUnlessStreamAccess(req: Request): Promise<NextResponse | null> {
  try {
    const ctx = await getRequestCtx(req);
    await requireActivePlan(ctx);
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
}
