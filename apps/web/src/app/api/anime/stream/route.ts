import { NextRequest, NextResponse } from 'next/server';
import { ANIME_CDN_HEADERS } from '@pelis/db/lib/vidnest-client';
import {
  fetchAnimeUpstream,
  isSafeAnimeUpstreamUrl,
  looksLikeM3u8,
  rewriteAnimeManifest,
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
  const isManifestUrl = upstream.toLowerCase().includes('.m3u8');
  const isSubtitleUrl = upstream.toLowerCase().includes('.vtt');

  try {
    const response = await fetchAnimeUpstream(upstream, ANIME_CDN_HEADERS, { range });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Upstream respondió ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') ?? '';

    // Manifests: rewrite every nested reference back through this route.
    if (isManifestUrl || contentType.includes('mpegurl')) {
      const text = await response.text();
      if (!looksLikeM3u8(text, contentType, upstream)) {
        // Usually a Cloudflare challenge page — surface it as upstream failure.
        return NextResponse.json(
          { error: 'El CDN devolvió una respuesta inválida (posible bloqueo)' },
          { status: 502 }
        );
      }
      const rewritten = rewriteAnimeManifest(text, upstream, resolveOrigin(request));
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
    if (isSubtitleUrl) {
      const text = await response.text();
      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Segments / keys: pipe verbatim.
    const headers = new Headers();
    headers.set('Content-Type', contentType || 'application/octet-stream');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');
    const contentLength = response.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);
    const contentRange = response.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);
    headers.set('Cache-Control', response.headers.get('cache-control') ?? 'public, max-age=86400');

    return new NextResponse(response.body, { status: response.status, headers });
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
