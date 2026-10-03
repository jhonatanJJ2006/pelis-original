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
 * so beyond the known suffixes we also accept hosts whose path matches a
 * known asset layout (`/anime/<32hex>/<32hex>/`, `/<32hex>/<32hex>/`, or
 * Aniwave `/cdn/<hex>`). Everything else is rejected.
 */
const ALLOWED_UPSTREAM_SUFFIXES = [
  '.watching.onl',
  '.livedns.my',
  '.cloudbuzz.lol',
  '.anivideo.sbs',
  '.megacloud.animanga.fun',
  '.kryntal.top',
  '.megaplay.buzz',
  // Current Aniwave HLS zone (VidNest `aniwave_hls`). Hostnames rotate inside
  // the zone (`px.dpopdrop89.store`, …); the path check below covers a move
  // to a brand-new zone.
  '.dpopdrop89.store',
];

/**
 * VidNest asset layouts we have actually seen:
 * - `/anime/<32hex>/<32hex>/…` (subtitles and older CDNs)
 * - `/<32hex>/<32hex>/…` (master playlists that dropped the `/anime` prefix)
 * - `/cdn/<64+ hex>` (Aniwave; variants and segments have no file extension
 *   and are served as `image/jpeg` even when the body is MPEG-TS or m3u8)
 */
const VIDNEST_ASSET_PATH_RE = /^\/(?:anime\/)?[0-9a-f]{32}\/[0-9a-f]{32}\//i;
const ANIWAVE_CDN_PATH_RE = /^\/cdn\/[0-9a-f]{32,}/i;

/** Referers we will forward. Anything else is ignored so `r` is not an open header. */
export const ALLOWED_ANIME_REFERERS = [
  'https://megaplay.buzz/',
  'https://play.echovideo.ru/',
  'https://vidnest.fun/',
  'https://aniwaves.ru/',
];

function hostMatchesSuffix(host: string, suffix: string): boolean {
  const dotted = suffix.startsWith('.') ? suffix : `.${suffix}`;
  const bare = dotted.slice(1);
  return host === bare || host.endsWith(dotted);
}

export function isSafeAnimeUpstreamUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (PRIVATE_HOST_RE.test(parsed.hostname)) return false;
    const host = parsed.hostname.toLowerCase();
    const knownZone = ALLOWED_UPSTREAM_SUFFIXES.some((suffix) => hostMatchesSuffix(host, suffix));
    return (
      knownZone ||
      VIDNEST_ASSET_PATH_RE.test(parsed.pathname) ||
      ANIWAVE_CDN_PATH_RE.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function sanitizeAnimeReferer(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    const origin = `${parsed.protocol}//${parsed.host}/`;
    return ALLOWED_ANIME_REFERERS.includes(origin) ? origin : undefined;
  } catch {
    return undefined;
  }
}

export function getMimeForUrl(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  const ext = pathname.match(/(\.[a-z0-9]+)(?:\?|$)/)?.[1] ?? '';
  return MIME[ext] || 'application/octet-stream';
}

export function buildAnimeProxyUrl(upstreamUrl: string, origin?: string, referer?: string): string {
  const params = new URLSearchParams({ u: upstreamUrl });
  const safeReferer = sanitizeAnimeReferer(referer);
  if (safeReferer) params.set('r', safeReferer);
  const path = `/api/anime/stream?${params.toString()}`;
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
  origin?: string,
  referer?: string
): string {
  const base = new URL(manifestUrl);

  const rewriteUri = (uri: string): string => {
    const trimmed = uri.trim();
    if (!trimmed) return trimmed;
    try {
      const absolute = new URL(trimmed, base).href;
      if (!isSafeAnimeUpstreamUrl(absolute)) return trimmed;
      return buildAnimeProxyUrl(absolute, origin, referer);
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
