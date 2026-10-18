import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pelis/db';
import {
  UPSTREAM_IDLE_TIMEOUT_MS,
  contentTypeForTvUpstream,
  fetchUpstream,
  isHlsManifestResponse,
  isSafeUpstreamUrl,
  readTextWithIdleTimeout,
  resolvePublicOrigin,
  rewriteTvManifest,
  upstreamUrlFromSearchParams,
  withIdleTimeout,
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

  // Decoded once by URLSearchParams. Never decodeURIComponent() it again:
  // signed segment URLs carry %2F / %3D / %2B that must reach the CDN intact.
  const upstreamParam = upstreamUrlFromSearchParams(req.nextUrl.searchParams);
  let upstreamUrl: string;

  try {
    const root = await getChannelStreamUrl(channelId);
    if (!root) {
      return NextResponse.json({ error: 'channel not found' }, { status: 404 });
    }

    if (upstreamParam) {
      upstreamUrl = upstreamParam;
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

  // Aborted when the viewer leaves or the upstream goes idle. There is no
  // total timeout: a live channel streams for as long as someone watches.
  const upstreamAbort = new AbortController();
  req.signal?.addEventListener('abort', () => upstreamAbort.abort(), { once: true });
  const abortUpstream = () => upstreamAbort.abort();

  let upstreamResp: Response;
  try {
    upstreamResp = await fetchUpstream(upstreamUrl, { range, signal: upstreamAbort.signal });
  } catch {
    return NextResponse.json({ error: 'upstream unreachable' }, { status: 502 });
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
      },
      { status }
    );
  }

  const finalUrl = upstreamResp.url || upstreamUrl;
  const upstreamType = upstreamResp.headers.get('content-type');

  if (isHlsManifestResponse(finalUrl, upstreamType)) {
    let text: string;
    try {
      text = await readTextWithIdleTimeout(upstreamResp, UPSTREAM_IDLE_TIMEOUT_MS, abortUpstream);
    } catch {
      return NextResponse.json({ error: 'upstream playlist interrupted' }, { status: 502 });
    }
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

  const body = upstreamResp.body
    ? withIdleTimeout(upstreamResp.body, UPSTREAM_IDLE_TIMEOUT_MS, abortUpstream)
    : null;

  return new NextResponse(body, {
    status: upstreamResp.status,
    headers,
  });
}
