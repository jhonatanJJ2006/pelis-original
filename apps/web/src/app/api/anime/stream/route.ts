import { NextRequest, NextResponse } from 'next/server';
import { ANIME_CDN_HEADERS } from '@pelis/db/lib/vidnest-client';
import {
  fetchAnimeUpstream,
  getMimeForUrl,
  isSafeAnimeUpstreamUrl,
  looksLikeM3u8,
  rewriteAnimeManifest,
  sanitizeAnimeReferer,
} from '@/lib/anime-stream-proxy';
import { denyUnlessStreamAccess } from '@/lib/require-stream-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streams anime HLS content through our domain.
 *
 * GET /api/anime/stream?u=<upstream url>
 *
 * The upstream must be a whitelisted anime CDN host (see
 * `isSafeAnimeUpstreamUrl`). Manifests are rewritten so every nested URL
 * loops back through this route; segments and subtitles are piped verbatim
 * with Range support so seeking works.
 */
export async function GET(request: NextRequest) {
  const denied = await denyUnlessStreamAccess(request);
  if (denied) return denied;

  const upstream = request.nextUrl.searchParams.get('u');
  if (!upstream) {
    return NextResponse.json({ error: 'Falta el parámetro u' }, { status: 400 });
  }
  if (!isSafeAnimeUpstreamUrl(upstream)) {
    return NextResponse.json({ error: 'Upstream no permitido' }, { status: 403 });
  }

  const range = request.headers.get('range');
  const referer = sanitizeAnimeReferer(request.nextUrl.searchParams.get('r'));
  const upstreamHeaders: Record<string, string> = { ...ANIME_CDN_HEADERS };
  if (referer) {
    upstreamHeaders.Referer = referer;
    upstreamHeaders.Origin = referer.replace(/\/$/, '');
  }
  const isManifestUrl = upstream.toLowerCase().includes('.m3u8');
  const isSubtitleUrl = upstream.toLowerCase().includes('.vtt');

  try {
    const response = await fetchAnimeUpstream(upstream, upstreamHeaders, { range });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json({ error: `Upstream respondió ${response.status}` }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') ?? '';
    // Buffer so we can sniff playlists and TS that the CDN labels as images
    // (Aniwave serves both `image/jpeg` with no file extension).
    const body = Buffer.from(await response.arrayBuffer());
    const head = body.subarray(0, 32).toString('utf8');
    const isPlaylist =
      isManifestUrl || contentType.includes('mpegurl') || head.startsWith('#EXTM3U');

    // Manifests: rewrite every nested reference back through this route.
    if (isPlaylist) {
      const text = body.toString('utf8');
      if (!looksLikeM3u8(text, contentType, upstream)) {
        // Usually a Cloudflare challenge page — surface it as upstream failure.
        return NextResponse.json(
          { error: 'El CDN devolvió una respuesta inválida (posible bloqueo)' },
          { status: 502 }
        );
      }
      const rewritten = rewriteAnimeManifest(text, upstream, resolveOrigin(request), referer);
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Subtitles: text passthrough with a proper type for <track>.
    if (isSubtitleUrl || head.startsWith('WEBVTT')) {
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Segments / keys. VidNest CDNs disguise MPEG-TS as images (or omit the
    // extension entirely). A leading 0x47 sync byte is a transport packet.
    const headers = new Headers();
    const disguisedExt = /\.(jpe?g|png|webp|gif|html|js|css|txt)(?:\?|$)/i.test(upstream);
    const isTransportStream = body.length > 0 && body[0] === 0x47;
    headers.set(
      'Content-Type',
      isTransportStream
        ? 'video/mp2t'
        : disguisedExt
          ? getMimeForUrl(upstream)
          : contentType || getMimeForUrl(upstream) || 'application/octet-stream'
    );
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', String(body.length));
    const contentRange = response.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);
    headers.set('Cache-Control', response.headers.get('cache-control') ?? 'public, max-age=86400');

    return new NextResponse(body, { status: response.status, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function resolveOrigin(request: NextRequest): string | undefined {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const candidate = (forwardedHost ?? host ?? '').split(',')[0].trim();
  if (!candidate) return undefined;
  return `${proto}://${candidate}`;
}
