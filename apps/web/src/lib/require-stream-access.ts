import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { AuthError, requireActivePlan } from '@pelis/db';
import { getRequestCtx } from '@pelis/db/server';
import { TtlCache } from './ttl-cache';

/**
 * Cada segmento HLS (uno cada ~10 s por espectador) pasaba por sesión + usuario +
 * plan en Postgres. Guardamos la decisión por cookie de sesión unos segundos para
 * que 1000 espectadores no sean ~300 consultas por segundo.
 */
const ALLOW_TTL_MS = 60_000;
const DENY_TTL_MS = 5_000;
const decisions = new TtlCache<{ status: number; message: string } | null>(10_000);

function sessionKey(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  const match = cookie.match(/(?:^|;\s*)((?:__Secure-)?[\w.-]*session_token)=([^;]+)/);
  const raw = match?.[2] || auth;
  if (!raw) return null;
  return createHash('sha256').update(raw).digest('base64url');
}

/**
 * Session + active plan (or ADMIN) before any stream bytes.
 * Unauthenticated → 401, no plan → 403.
 */
export async function denyUnlessStreamAccess(req: Request): Promise<NextResponse | null> {
  const key = sessionKey(req);
  if (key) {
    const cached = decisions.get(key);
    if (cached === null) return null;
    if (cached) return NextResponse.json({ error: cached.message }, { status: cached.status });
  }
  try {
    const ctx = await getRequestCtx(req);
    await requireActivePlan(ctx);
    if (key) decisions.set(key, null, ALLOW_TTL_MS);
    return null;
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof AuthError ? err.message : 'No autenticado';
    if (key) decisions.set(key, { status, message }, DENY_TTL_MS);
    return NextResponse.json({ error: message }, { status });
  }
}

/** Solo para tests. */
export function __clearStreamAccessCache(): void {
  decisions.clear();
}
