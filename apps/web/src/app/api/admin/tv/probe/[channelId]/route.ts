import { NextRequest, NextResponse } from 'next/server';
import { getRequestCtx, isAdmin } from '@pelis/db';
import { probeTvStream } from '@/lib/tv-stream-proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: { channelId: string } }) {
  const channelId = params.channelId;
  if (!channelId) {
    return NextResponse.json({ error: 'missing channel id' }, { status: 400 });
  }

  try {
    const ctx = await getRequestCtx(_req);
    if (!(await isAdmin(ctx))) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { prisma } = await import('@pelis/db');
    const channel = await prisma.tVChannel.findUnique({ where: { id: channelId } });
    if (!channel) {
      return NextResponse.json({ error: 'channel not found' }, { status: 404 });
    }

    const streamUrl = channel.streamUrl?.trim();
    if (!streamUrl) {
      await prisma.tVChannel.update({
        where: { id: channelId },
        data: {
          streamStatus: 'OFFLINE',
          lastStreamError: 'URL no válida',
          lastCheckedAt: new Date(),
        },
      });
      return NextResponse.json({
        channelId,
        name: channel.name,
        streamStatus: 'offline',
        lastStreamError: 'URL no válida',
      });
    }

    const { isSafeUpstreamUrl } = await import('@/lib/tv-stream-proxy');
    if (!isSafeUpstreamUrl(streamUrl)) {
      await prisma.tVChannel.update({
        where: { id: channelId },
        data: {
          streamStatus: 'OFFLINE',
          lastStreamError: 'URL no válida',
          lastCheckedAt: new Date(),
        },
      });
      return NextResponse.json({
        channelId,
        name: channel.name,
        streamStatus: 'offline',
        lastStreamError: 'URL no válida',
      });
    }

    const result = await probeTvStream(streamUrl);

    await prisma.tVChannel.update({
      where: { id: channelId },
      data: {
        streamStatus: result.streamStatus === 'online' ? 'ONLINE' : 'OFFLINE',
        lastCheckedAt: new Date(),
        lastStreamError: result.lastStreamError ?? null,
      },
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
