import { NextRequest, NextResponse } from 'next/server';
import { getRequestCtx, isAdmin, invoke } from '@pelis/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestCtx(req);
    if (!(await isAdmin(ctx))) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const result = await invoke({
      name: 'tv.seedPopularChannels',
      args: { dryRun: false },
      ctx,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al sembrar';
    const status = message === 'No autenticado' || message.includes('admin') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}