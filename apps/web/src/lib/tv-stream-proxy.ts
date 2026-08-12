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

const LOOPBACK_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(:\d+)?$/i;

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

export function buildTvProxyUrl(
  channelId: string,
  upstreamUrl?: string,
  origin?: string
): string {
  const path = `/api/tv/stream/${channelId}`;
  const relative = upstreamUrl
    ? `${path}?u=${encodeURIComponent(upstreamUrl)}`
    : path;

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
  const safeOrigin =
    proxyOrigin && !LOOPBACK_ORIGIN_RE.test(proxyOrigin)
      ? proxyOrigin
      : undefined;

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

export async function fetchUpstream(
  url: string,
  opts?: { range?: string | null }
): Promise<Response> {
  const headers: HeadersInit = {
    Accept: '*/*',
    'User-Agent':
      'Mozilla/5.0 (compatible; PelisTV/1.0; +https://verpelis.pro)',
  };

  if (opts?.range) {
    headers.Range = opts.range;
  }

  return fetch(url, {
    headers,
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
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

export async function probeTvStream(
  streamUrl: string,
  depth = 0
): Promise<TvProbeResult> {
  if (!isSafeUpstreamUrl(streamUrl)) {
    return { streamStatus: 'offline', lastStreamError: 'URL no válida o no permitida' };
  }

  try {
    const response = await fetchUpstream(streamUrl);
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
      return { streamStatus: 'online' };
    }

    const text = await response.text();
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
