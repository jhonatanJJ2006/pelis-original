import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@pelis/convex';
import { getToken } from '@/lib/auth';
import { isSafeUpstreamUrl, probeTvStream } from '@/lib/tv-stream-proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdminClient() {
  const token = await getToken();
  if (!token) {
    throw new Error('No autenticado');
  }

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');

  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  await client.query(api.tv.pingAdmin, {});
  return client;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const channelId = params.channelId;
  if (!channelId) {
    return NextResponse.json({ error: 'missing channel id' }, { status: 400 });
  }

  try {
    const client = await requireAdminClient();
    const channel = await client.query(api.tv.getById, { id: channelId as any });
    if (!channel) {
      return NextResponse.json({ error: 'channel not found' }, { status: 404 });
    }

    const streamUrl = channel.streamUrl?.trim();
    if (!streamUrl || !isSafeUpstreamUrl(streamUrl)) {
      return NextResponse.json(
        {
          channelId,
          name: channel.name,
          streamStatus: 'offline' as const,
          lastStreamError: 'URL no válida',
        },
        { status: 200 }
      );
    }

    const result = await probeTvStream(streamUrl);

    await client.mutation(api.tv.reportStreamStatus, {
      channelId: channelId as any,
      streamStatus: result.streamStatus,
      lastStreamError: result.lastStreamError,
    });

    return NextResponse.json({
      channelId,
      name: channel.name,
      streamStatus: result.streamStatus,
      lastStreamError: result.lastStreamError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al verificar';
    const status = message === 'No autenticado' || message.includes('admin') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
