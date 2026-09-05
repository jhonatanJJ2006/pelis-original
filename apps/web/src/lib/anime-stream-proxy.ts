/**
 * Anime stream proxy helpers.
 *
 * The anime HLS sources live on VidNest CDNs (`*.watching.onl`,
 * `*.livedns.my`, …). Those CDNs
 * blocks non-browser requests and cross-origin reads, so the browser never
 * talks to it directly: everything is piped through `/api/anime/stream?u=…`,
 * which injects the required headers and rewrites manifests so every child
 * URL (variants, segments, keys) also stays on our domain.
 *
 * Same architecture as `tv-stream-proxy.ts`, with a host whitelist instead of
 * DB-backed channels.
 */

const MIME: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.aac': 'audio/aac',
  '.vtt': 'text/vtt',
  '.jpg': 'video/mp2t',
  '.jpeg': 'video/mp2t',
  '.html': 'video/mp2t',
  '.js': 'video/mp2t',
  '.css': 'video/mp2t',
  '.txt': 'video/mp2t',
  '.png': 'video/mp2t',
  '.webp': 'video/mp2t',
  '.gif': 'video/mp2t',
};

const PRIVATE_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/i;

const LOOPBACK_ORIGIN_RE = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(:\d+)?$/i;

/**
 * Hosts we are willing to proxy. Kept tight on purpose — this endpoint would
 * otherwise be an open relay. VidNest CDN hostnames rotate across a few zones
 * (`*.watching.onl`, `*.livedns.my`, `*.cloudbuzz.lol`, `*.anivideo.sbs`, …),
 * so beyond the known suffixes we also accept any host whose path matches the
 * exact asset layout those CDNs use (`/anime/<32hex>/<32hex>/…`). Everything
 * else is rejected.
 */
const ALLOWED_UPSTREAM_SUFFIXES = [
  '.watching.onl',
  '.livedns.my',
  '.cloudbuzz.lol',
  '.anivideo.sbs',
  '.megacloud.animanga.fun',
  'megacloud.animanga.fun',
  '.kryntal.top',
  'cdn.kryntal.top',
  '.megaplay.buzz',
];

const VIDNEST_ASSET_PATH_RE = /^\/anime\/[0-9a-f]{32}\/[0-9a-f]{32}\//i;

export function isSafeAnimeUpstreamUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (PRIVATE_HOST_RE.test(parsed.hostname)) return false;
    const host = parsed.hostname.toLowerCase();
    const knownZone = ALLOWED_UPSTREAM_SUFFIXES.some(
      (suffix) => host === suffix.slice(1) || host.endsWith(suffix)
    );
    return knownZone || VIDNEST_ASSET_PATH_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function getMimeForUrl(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  const ext = pathname.match(/(\.[a-z0-9]+)(?:\?|$)/)?.[1] ?? '';
  return MIME[ext] || 'application/octet-stream';
}

export function buildAnimeProxyUrl(upstreamUrl: string, origin?: string): string {
  const path = `/api/anime/stream?u=${encodeURIComponent(upstreamUrl)}`;
  if (!origin || LOOPBACK_ORIGIN_RE.test(origin)) return path;
  return `${origin.replace(/\/$/, '')}${path}`;
}

/**
 * Rewrite every non-comment line of an m3u8 through our proxy. Relative
 * references are resolved against the manifest URL first. `#EXT-X-KEY:URI=`
 * and `#EXT-X-MEDIA:URI=` / `#EXT-X-MAP:URI=` attributes are rewritten too.
 */
export function rewriteAnimeManifest(
  content: string,
  manifestUrl: string,
  origin?: string
): string {
  const base = new URL(manifestUrl);

  const rewriteUri = (uri: string): string => {
    const trimmed = uri.trim();
    if (!trimmed) return trimmed;
    try {
      const absolute = new URL(trimmed, base).href;
      if (!isSafeAnimeUpstreamUrl(absolute)) return trimmed;
      return buildAnimeProxyUrl(absolute, origin);
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

export function looksLikeM3u8(content: string, contentType: string, url: string): boolean {
  if (contentType.includes('mpegurl') || contentType.includes('x-mpegurl')) return true;
  if (url.toLowerCase().includes('.m3u8')) return true;
  const head = content.slice(0, 512);
  return head.startsWith('#EXTM3U') || head.includes('#EXT-X-');
}

export async function fetchAnimeUpstream(
  url: string,
  extraHeaders: Record<string, string>,
  opts?: { range?: string | null }
): Promise<Response> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (opts?.range) headers.Range = opts.range;
  return fetch(url, {
    headers,
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });
}
