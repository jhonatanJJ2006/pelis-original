/**
 * What the web TV player can do with a channel URL:
 *  - hls: hls.js (or native HLS on Safari)
 *  - native: progressive file the <video> element plays directly (mp4/webm/mov)
 *  - mpegts: raw MPEG-TS stream; browsers cannot play it without mpegts.js
 */
export type TvStreamKind = 'hls' | 'native' | 'mpegts';

const NATIVE_EXT_RE = /\.(mp4|m4v|webm|mov)$/i;
const MPEGTS_EXT_RE = /\.ts$/i;

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0] ?? url;
  }
}

/** Extension-only guess. Extensionless URLs default to HLS (most IPTV lists). */
export function tvStreamKindFromUrl(url: string | null | undefined): TvStreamKind {
  if (!url) return 'hls';
  const pathname = pathnameOf(url.trim());
  if (/\.m3u8?$/i.test(pathname)) return 'hls';
  if (NATIVE_EXT_RE.test(pathname)) return 'native';
  if (MPEGTS_EXT_RE.test(pathname)) return 'mpegts';
  return 'hls';
}
