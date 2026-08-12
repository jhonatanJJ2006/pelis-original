import { NextResponse } from 'next/server';
import { getRequestCtx, isAdmin } from '@pelis/db';
import { bulkEnrichMovies } from '@/lib/enrichment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getRequestCtx(req);
  if (!(await isAdmin(ctx))) {
    return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { movieIds?: string[] };
  if (!Array.isArray(body.movieIds)) {
    return NextResponse.json({ error: 'movieIds[] requerido' }, { status: 400 });
  }
  try {
    const result = await bulkEnrichMovies(body.movieIds);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error en enriquecimiento masivo' },
      { status: 500 },
    );
  }
}