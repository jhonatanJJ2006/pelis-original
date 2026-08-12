import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@pelis/convex';
import { getToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');

    const client = new ConvexHttpClient(url);
    client.setAuth(token);

    await client.query(api.tv.pingAdmin, {});

    const result = await client.mutation(api.seedPopularChannels.seedPopularChannels, {
      dryRun: false,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al sembrar';
    const status = message === 'No autenticado' || message.includes('admin') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}