/**
 * Server-side helpers used by Next.js API routes.
 *
 * - `getRequestCtx(req)`: extracts session from cookies and builds the
 *   RequestCtx expected by handlers.
 * - `preloadQuery(name, args, req)`: SSR pre-fetch (used by RSC pages).
 */

import type { NextRequest } from 'next/server';
import './registry-bootstrap';
import { auth } from './auth';
import { prisma } from './client';
import { invoke } from './invoke';
import type { RequestCtx } from './lib/requireAdmin';

export async function getRequestCtx(req: Request | NextRequest): Promise<RequestCtx> {
  const headers = req.headers;
  try {
    const session = await auth().api.getSession({ headers: new Headers(headers) });
    if (!session?.user?.id) return { userId: null, isAdmin: false };
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    return { userId: session.user.id, isAdmin: user?.role === 'ADMIN' };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

export async function preloadQuery<T = unknown>(
  name: string,
  args: unknown,
  req: Request | NextRequest,
): Promise<PreloadedQuery<T>> {
  const ctx = await getRequestCtx(req);
  const data = (await invoke({ name, args, ctx })) as T;
  return { name, args, data };
}

export interface PreloadedQuery<T> {
  name: string;
  args: unknown;
  data: T;
}

export { auth, prisma, invoke };