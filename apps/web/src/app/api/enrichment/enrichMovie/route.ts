import { NextResponse } from 'next/server';
import { getRequestCtx, isAdmin } from '@pelis/db';
import { performMovieEnrichment } from '@/lib/enrichment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getRequestCtx(req);
  if (!(await isAdmin(ctx))) {
    return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    movieId?: string;
    tmdbId?: number;
    replaceImage?: boolean;
    replaceBackdrop?: boolean;
  };
  if (!body.movieId || typeof body.tmdbId !== 'number') {
    return NextResponse.json({ error: 'movieId y tmdbId requeridos' }, { status: 400 });
  }
  try {
    const result = await performMovieEnrichment(
      body.movieId,
      body.tmdbId,
      body.replaceImage ?? false,
      body.replaceBackdrop ?? false
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al enriquecer' },
      { status: 500 }
    );
  }
}
