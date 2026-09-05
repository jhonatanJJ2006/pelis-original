import { NextResponse } from 'next/server';
import { getRequestCtx, isAdmin } from '@pelis/db';
import { previewMovieMetadata } from '@/lib/enrichment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getRequestCtx(req);
  if (!(await isAdmin(ctx))) {
    return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { movieId?: string; tmdbId?: number };
  if (!body.movieId) {
    return NextResponse.json({ error: 'movieId requerido' }, { status: 400 });
  }
  try {
    const result = await previewMovieMetadata(body.movieId, body.tmdbId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al obtener preview';
    const status = message.includes('admin') ? 403 : message.includes('válido') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
