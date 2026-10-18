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
import { TtlCache } from '@/lib/ttl-cache';

/**
 * Consultas públicas del catálogo que no dependen del usuario. Con muchos
 * visitantes a la vez se piden igual en cada carga (movies.list pesa ~160 KB),
 * así que se guardan 60 s por proceso.
 */
const PUBLIC_CACHED_QUERIES = new Set([
  'movies.list',
  'movies.getFeatured',
  'movies.getTrending',
  'movies.listSeries',
  'movies.getGenres',
  'anime.getGenres',
]);
const PUBLIC_QUERY_TTL_MS = 60_000;
const publicQueryCache = new TtlCache<string>(500);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { name: string } }) {
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

  const cacheKey =
    def.kind === 'query' && PUBLIC_CACHED_QUERIES.has(name)
      ? `${name}:${JSON.stringify(args ?? {})}`
      : null;
  if (cacheKey) {
    const cached = publicQueryCache.get(cacheKey);
    if (cached !== undefined) {
      return new NextResponse(cached, {
        headers: { 'Content-Type': 'application/json', 'X-Pelis-Cache': 'HIT' },
      });
    }
  }

  const ctx = await getRequestCtx(req);

  try {
    const data = await invoke({ name, args, ctx });
    if (cacheKey) {
      const body = JSON.stringify(data ?? null);
      publicQueryCache.set(cacheKey, body, PUBLIC_QUERY_TTL_MS);
      return new NextResponse(body, {
        headers: { 'Content-Type': 'application/json', 'X-Pelis-Cache': 'MISS' },
      });
    }
    return NextResponse.json(data ?? null);
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
