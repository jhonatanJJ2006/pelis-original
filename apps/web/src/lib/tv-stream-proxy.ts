import type { TvStreamKind } from '@pelis/db/tv-stream-kind';

const MIME: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.aac': 'audio/aac',
  '.vtt': 'text/vtt',
};

const PRIVATE_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/i;

const LOOPBACK_ORIGIN_RE = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(:\d+)?$/i;

/**
 * Devuelve el origin público que el navegador realmente usó para llegar al servidor.
 * Importante cuando hay un reverse-proxy (Cloudflare Tunnel, nginx, etc.) delante
 * de Next.js: `req.nextUrl.origin` puede devolver `http://localhost:3000`.
 *
 * Prioridad:
 *   1. X-Forwarded-Proto + X-Forwarded-Host / Host (si no son loopback)
 *   2. Si el origin detectado es loopback → fallback al header Host
 *   3. Si nada es confiable → devuelve `null` para que el caller emita URLs relativas
 */
export function resolvePublicOrigin(headers: Headers): string | null {
  const forwardedHost = headers.get('x-forwarded-host');
  const host = headers.get('host');
  const xfp = headers.get('x-forwarded-proto');
  const referer = headers.get('referer');

  const candidateHost = (forwardedHost ?? host ?? '').split(',')[0].trim();
  if (!candidateHost) return null;

  let protocol = (xfp ?? '').split(',')[0].trim();
  if (!protocol) {
    if (referer) {
      try {
        protocol = new URL(referer).protocol.replace(':', '');
      } catch {
        protocol = '';
      }
    }
  }
  if (protocol !== 'http' && protocol !== 'https') {
    protocol = 'https';
  }

  // Si el host es loopback (interno) y tenemos un referer público, usar el referer.
  const hostIsLoopback = PRIVATE_HOST_RE.test(candidateHost.split(':')[0]);
  if (hostIsLoopback && referer) {
    try {
      const r = new URL(referer);
      if (!PRIVATE_HOST_RE.test(r.hostname)) {
        return `${r.protocol}//${r.host}`;
      }
    } catch {
      // ignore
    }
  }

  return `${protocol}://${candidateHost}`;
}

export function getMimeForUrl(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  const ext = pathname.match(/(\.[a-z0-9]+)(?:\?|$)/)?.[1] ?? '';
  return MIME[ext] || 'application/octet-stream';
}

const MEDIA_PATH_RE = /\.(ts|m4s|mp4|m4a|m4v|aac|vtt|key)$/i;

/**
 * Some CDNs (Pluto/Ora) label AES-128 MPEG-TS segments as application/x-mpegURL.
 * Treating those as playlists decodes the ciphertext as text and the picture stays black.
 * A real media extension is never a manifest. Extensionless URLs still follow Content-Type.
 */
export function isHlsManifestResponse(
  finalUrl: string,
  contentType: string | null | undefined
): boolean {
  let pathname = finalUrl.split('?')[0] ?? finalUrl;
  try {
    pathname = new URL(finalUrl).pathname;
  } catch {
    // keep the query-stripped string
  }
  if (MEDIA_PATH_RE.test(pathname)) return false;
  if (pathname.toLowerCase().endsWith('.m3u8')) return true;
  return (contentType ?? '').toLowerCase().includes('mpegurl');
}

export function contentTypeForTvUpstream(
  finalUrl: string,
  upstreamType: string | null | undefined
): string {
  if (isHlsManifestResponse(finalUrl, upstreamType)) return 'application/vnd.apple.mpegurl';
  let byExt = 'application/octet-stream';
  try {
    byExt = getMimeForUrl(finalUrl);
  } catch {
    // invalid URL: fall through to the upstream type
  }
  const raw = upstreamType?.split(';')[0]?.trim();
  if (!raw || raw.toLowerCase().includes('mpegurl')) return byExt;
  return raw;
}

export function isSafeUpstreamUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (PRIVATE_HOST_RE.test(parsed.hostname)) return false;
    if (parsed.hostname.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildTvProxyUrl(channelId: string, upstreamUrl?: string, origin?: string): string {
  const path = `/api/tv/stream/${channelId}`;
  const relative = upstreamUrl ? `${path}?u=${encodeURIComponent(upstreamUrl)}` : path;

  // Sin origin, o si el origin es loopback → siempre devolver URL RELATIVA
  // para que el navegador use el origin actual y no se conecte a localhost.
  if (!origin || LOOPBACK_ORIGIN_RE.test(origin)) return relative;

  return `${origin.replace(/\/$/, '')}${relative}`;
}

export function rewriteTvManifest(
  content: string,
  manifestUrl: string,
  channelId: string,
  proxyOrigin?: string
): string {
  const base = new URL(manifestUrl);

  // Si el origin es loopback o no fue provisto, devolvemos URLs relativas
  const safeOrigin = proxyOrigin && !LOOPBACK_ORIGIN_RE.test(proxyOrigin) ? proxyOrigin : undefined;

  const rewriteUri = (uri: string): string => {
    const trimmed = uri.trim();
    if (!trimmed) return trimmed;
    try {
      const absolute = new URL(trimmed, base).href;
      if (!isSafeUpstreamUrl(absolute)) return trimmed;
      return buildTvProxyUrl(channelId, absolute, safeOrigin);
    } catch {
      return trimmed;
    }
  };

  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        if (trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (_, uri: string) => `URI="${rewriteUri(uri)}"`);
        }
        return line;
      }

      return rewriteUri(trimmed);
    })
    .join('\n');
}

/** Time allowed for the upstream to answer with status + headers. */
export const UPSTREAM_CONNECT_TIMEOUT_MS = 20_000;
/**
 * Time allowed between two body chunks. A live channel streams for hours, so
 * the body must never be bounded by a total timeout, only by inactivity.
 */
export const UPSTREAM_IDLE_TIMEOUT_MS = 30_000;

/**
 * The `u` query param, decoded exactly once. URLSearchParams.get already
 * percent-decodes; decoding again turned `%2F`/`%3D`/`%2B` inside signed
 * segment URLs into `/`, `=` and spaces, so segments answered 403/404.
 */
export function upstreamUrlFromSearchParams(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get('u');
  return raw ? raw : null;
}

export async function fetchUpstream(
  url: string,
  opts?: { range?: string | null; signal?: AbortSignal; connectTimeoutMs?: number }
): Promise<Response> {
  const headers: HeadersInit = {
    Accept: '*/*',
    'User-Agent': 'Mozilla/5.0 (compatible; PelisTV/1.0; +https://verpelis.pro)',
  };

  if (opts?.range) {
    headers.Range = opts.range;
  }

  const controller = new AbortController();
  const outer = opts?.signal;
  const forwardAbort = () => controller.abort(outer?.reason);
  if (outer) {
    if (outer.aborted) forwardAbort();
    else outer.addEventListener('abort', forwardAbort, { once: true });
  }
  // Only status + headers are timed. The body keeps the same signal, so the
  // caller can still abort it (client gone, idle timeout).
  const timer = setTimeout(
    () => controller.abort(new Error('upstream connect timeout')),
    opts?.connectTimeoutMs ?? UPSTREAM_CONNECT_TIMEOUT_MS
  );

  try {
    return await fetch(url, {
      headers,
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pass-through stream that calls `onIdle` and stops when the upstream sends
 * nothing for `idleMs`. Pull-based: while the client applies backpressure we
 * are not waiting on the upstream, so a slow viewer is never cut.
 */
export function withIdleTimeout(
  body: ReadableStream<Uint8Array>,
  idleMs: number,
  onIdle: () => void
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      clear();
      timer = setTimeout(() => {
        timer = null;
        onIdle();
        reader.cancel(new Error('upstream idle timeout')).catch(() => {});
      }, idleMs);
      try {
        const { done, value } = await reader.read();
        clear();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (err) {
        clear();
        controller.error(err);
      }
    },
    cancel(reason) {
      clear();
      return reader.cancel(reason);
    },
  });
}

/** Reads a small text body (playlist) with the idle guard instead of a total timeout. */
export async function readTextWithIdleTimeout(
  response: Response,
  idleMs: number,
  onIdle: () => void
): Promise<string> {
  if (!response.body) return '';
  return new Response(withIdleTimeout(response.body, idleMs, onIdle)).text();
}

export type DetectedTvStreamKind = TvStreamKind | 'unknown';

function startsWithBytes(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  if (bytes.length < offset + expected.length) return false;
  return expected.every((b, i) => bytes[offset + i] === b);
}

/**
 * What the upstream really serves, from Content-Type, URL and (optionally) the
 * first bytes. Many IPTV servers label raw MPEG-TS as application/octet-stream,
 * so sniffing the 0x47 sync byte is the only reliable signal.
 */
export function detectTvStreamKind(input: {
  url: string;
  contentType?: string | null;
  firstBytes?: Uint8Array | null;
}): DetectedTvStreamKind {
  const { url, firstBytes } = input;
  const contentType = (input.contentType ?? '').toLowerCase();
  if (isHlsManifestResponse(url, contentType)) return 'hls';

  if (firstBytes && firstBytes.length > 0) {
    const head = new TextDecoder().decode(firstBytes.slice(0, 16)).trimStart();
    if (head.startsWith('#EXTM3U')) return 'hls';
    if (firstBytes[0] === 0x47 && (firstBytes.length <= 188 || firstBytes[188] === 0x47)) {
      return 'mpegts';
    }
    if (startsWithBytes(firstBytes, 4, [0x66, 0x74, 0x79, 0x70])) return 'native'; // ftyp
    if (startsWithBytes(firstBytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) return 'native'; // webm
  }

  if (contentType.includes('video/mp2t')) return 'mpegts';
  if (/video\/(mp4|webm|quicktime)|audio\/mp4/.test(contentType)) return 'native';

  let pathname = url.split('?')[0] ?? url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    // keep the query-stripped string
  }
  if (/\.ts$/i.test(pathname)) return 'mpegts';
  if (/\.(mp4|m4v|webm|mov)$/i.test(pathname)) return 'native';
  return 'unknown';
}

/** Probe verdict for a non-playlist response, matching what the web player can play. */
export function probeVerdictForKind(kind: DetectedTvStreamKind): TvProbeResult {
  if (kind === 'native' || kind === 'hls') return { streamStatus: 'online' };
  if (kind === 'mpegts') {
    return {
      streamStatus: 'offline',
      lastStreamError: 'Formato MPEG-TS directo: el reproductor web no lo soporta',
    };
  }
  return { streamStatus: 'offline', lastStreamError: 'Formato de stream no reconocido' };
}

async function readFirstBytes(response: Response, max = 2048): Promise<Uint8Array | null> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < max) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
    const out = new Uint8Array(Math.min(total, max));
    let offset = 0;
    for (const chunk of chunks) {
      const take = Math.min(chunk.length, out.length - offset);
      out.set(chunk.subarray(0, take), offset);
      offset += take;
      if (offset >= out.length) break;
    }
    return out;
  } finally {
    reader.cancel().catch(() => {});
  }
}

function looksLikeM3u8(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.startsWith('#EXTM3U') || trimmed.includes('#EXT-X-');
}

function extractVariantUrls(content: string, manifestUrl: string): string[] {
  const base = new URL(manifestUrl);
  const lines = content.split(/\r?\n/);
  const urls: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXT-X-STREAM-INF') && !line.startsWith('#EXT-X-I-FRAME-STREAM-INF')) {
      continue;
    }
    const next = lines[i + 1]?.trim();
    if (!next || next.startsWith('#')) continue;
    try {
      const absolute = new URL(next, base).href;
      if (isSafeUpstreamUrl(absolute)) urls.push(absolute);
    } catch {
      // skip invalid urls
    }
  }

  return urls;
}

export type TvProbeResult = {
  streamStatus: 'online' | 'offline';
  lastStreamError?: string;
};

export async function probeTvStream(streamUrl: string, depth = 0): Promise<TvProbeResult> {
  if (!isSafeUpstreamUrl(streamUrl)) {
    return { streamStatus: 'offline', lastStreamError: 'URL no válida o no permitida' };
  }

  try {
    const response = await fetchUpstream(streamUrl, { connectTimeoutMs: 12_000 });
    if (!response.ok) {
      let detail = `${response.status}`;
      try {
        const text = await response.text();
        if (text.length < 200) detail = `${response.status}: ${text.replace(/\s+/g, ' ').trim()}`;
      } catch {
        // keep status only
      }
      return { streamStatus: 'offline', lastStreamError: detail };
    }

    const finalUrl = response.url || streamUrl;
    const contentType = response.headers.get('content-type') ?? '';
    const isManifest =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL') ||
      finalUrl.toLowerCase().includes('.m3u8');

    if (!isManifest) {
      // A continuous stream never ends: sniff the first bytes, then hang up.
      const firstBytes = await readFirstBytes(response);
      return probeVerdictForKind(detectTvStreamKind({ url: finalUrl, contentType, firstBytes }));
    }

    const text = await readTextWithIdleTimeout(response, 12_000, () => {});
    if (!looksLikeM3u8(text)) {
      return {
        streamStatus: 'offline',
        lastStreamError: 'Respuesta no es un manifiesto M3U8 válido',
      };
    }

    const variants = extractVariantUrls(text, finalUrl);
    if (variants.length > 0 && depth < 2) {
      return probeTvStream(variants[0], depth + 1);
    }

    if (!text.includes('#EXTINF')) {
      return {
        streamStatus: 'offline',
        lastStreamError: 'Manifiesto sin segmentos de video',
      };
    }

    return { streamStatus: 'online' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de conexión';
    return { streamStatus: 'offline', lastStreamError: message };
  }
}
