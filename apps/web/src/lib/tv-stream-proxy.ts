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

export function buildTvProxyUrl(channelId: string, upstreamUrl?: string): string {
  const base = `/api/tv/stream/${channelId}`;
  if (!upstreamUrl) return base;
  return `${base}?u=${encodeURIComponent(upstreamUrl)}`;
}

export function rewriteTvManifest(
  content: string,
  manifestUrl: string,
  channelId: string
): string {
  const base = new URL(manifestUrl);

  const rewriteUri = (uri: string): string => {
    const trimmed = uri.trim();
    if (!trimmed) return trimmed;
    try {
      const absolute = new URL(trimmed, base).href;
      if (!isSafeUpstreamUrl(absolute)) return trimmed;
      return buildTvProxyUrl(channelId, absolute);
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
