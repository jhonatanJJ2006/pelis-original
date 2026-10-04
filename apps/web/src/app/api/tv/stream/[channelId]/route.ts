import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pelis/db';
import {
  contentTypeForTvUpstream,
  fetchUpstream,
  isHlsManifestResponse,
  isSafeUpstreamUrl,
  resolvePublicOrigin,
  rewriteTvManifest,
} from '@/lib/tv-stream-proxy';
import { denyUnlessStreamAccess } from '@/lib/require-stream-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getChannelStreamUrl(channelId: string): Promise<string | null> {
  const channel = await prisma.tVChannel.findUnique({ where: { id: channelId } });
  // Active + not proven OFFLINE: UNKNOWN (pre-probe / reset) must still be playable.
  if (!channel?.isActive || channel.streamStatus === 'OFFLINE') return null;
  const streamUrl = channel.streamUrl?.trim();
  if (!streamUrl || !isSafeUpstreamUrl(streamUrl)) return null;
  return streamUrl;
}

export async function GET(req: NextRequest, { params }: { params: { channelId: string } }) {
  const denied = await denyUnlessStreamAccess(req);
  if (denied) return denied;

  const channelId = params.channelId;
  if (!channelId) {
    return NextResponse.json({ error: 'missing channel id' }, { status: 400 });
  }

  const upstreamParam = req.nextUrl.searchParams.get('u');
  let upstreamUrl: string;

  try {
    const root = await getChannelStreamUrl(channelId);
    if (!root) {
      return NextResponse.json({ error: 'channel not found' }, { status: 404 });
    }

    if (upstreamParam) {
      upstreamUrl = decodeURIComponent(upstreamParam);
      if (!isSafeUpstreamUrl(upstreamUrl)) {
        return NextResponse.json({ error: 'invalid upstream url' }, { status: 400 });
      }
    } else {
      upstreamUrl = root;
    }
  } catch {
    return NextResponse.json({ error: 'channel lookup failed' }, { status: 500 });
  }

  const range = req.headers.get('range');

  let upstreamResp: Response;
  try {
    upstreamResp = await fetchUpstream(upstreamUrl, { range });
  } catch {
    return NextResponse.json(
      { error: 'upstream unreachable', upstream: upstreamUrl },
      { status: 502 }
    );
  }

  if (!upstreamResp.ok) {
    let errorMessage = `upstream error (${upstreamResp.status})`;
    try {
      const text = await upstreamResp.text();
      const json = JSON.parse(text) as { message?: string };
      if (json.message) errorMessage = json.message;
      else if (text.length < 300) errorMessage = text;
    } catch {
      // keep default message
    }

    const status =
      upstreamResp.status >= 400 && upstreamResp.status < 600 ? upstreamResp.status : 502;

    return NextResponse.json(
      {
        error: errorMessage,
        status: upstreamResp.status,
        upstream: upstreamUrl,
      },
      { status }
    );
  }

  const finalUrl = upstreamResp.url || upstreamUrl;
  const upstreamType = upstreamResp.headers.get('content-type');

  if (isHlsManifestResponse(finalUrl, upstreamType)) {
    const text = await upstreamResp.text();
    const proxyOrigin = resolvePublicOrigin(req.headers);
    const rewritten = rewriteTvManifest(text, finalUrl, channelId, proxyOrigin ?? undefined);
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', contentTypeForTvUpstream(finalUrl, upstreamType));
  headers.set('Cache-Control', 'no-store');
  headers.set('Access-Control-Allow-Origin', '*');

  const contentLength = upstreamResp.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);

  const contentRange = upstreamResp.headers.get('content-range');
  if (contentRange) headers.set('Content-Range', contentRange);

  const acceptRanges = upstreamResp.headers.get('accept-ranges');
  if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);

  return new NextResponse(upstreamResp.body, {
    status: upstreamResp.status,
    headers,
  });
}
