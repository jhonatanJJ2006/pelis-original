/**
 * Pure rules shared by scripts/probe-all-tv.mjs (and its unit tests).
 * Keep detectKind in sync with detectTvStreamKind in
 * apps/web/src/lib/tv-stream-proxy.ts: the probe must only mark ONLINE what
 * the web player can actually play.
 */

/** A channel turns OFFLINE only after this many consecutive failed runs. */
export const OFFLINE_AFTER_FAILURES = 2;

/** Mirrors detectTvStreamKind in apps/web/src/lib/tv-stream-proxy.ts. */
export function detectKind(url, contentType, bytes) {
  const ct = (contentType ?? '').toLowerCase();
  if (bytes && bytes.length > 0) {
    const head = new TextDecoder().decode(bytes.slice(0, 16)).trimStart();
    if (head.startsWith('#EXTM3U')) return 'hls';
    if (bytes[0] === 0x47 && (bytes.length <= 188 || bytes[188] === 0x47)) return 'mpegts';
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      return 'native';
    }
    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
      return 'native';
    }
  }
  if (ct.includes('video/mp2t')) return 'mpegts';
  if (/video\/(mp4|webm|quicktime)|audio\/mp4/.test(ct)) return 'native';
  let pathname = url.split('?')[0];
  try {
    pathname = new URL(url).pathname;
  } catch {
    // keep
  }
  if (/\.ts$/i.test(pathname)) return 'mpegts';
  if (/\.(mp4|m4v|webm|mov)$/i.test(pathname)) return 'native';
  return 'unknown';
}

export function verdictForKind(kind) {
  if (kind === 'native' || kind === 'hls') return { streamStatus: 'online' };
  if (kind === 'mpegts') {
    return {
      streamStatus: 'offline',
      lastStreamError: 'Formato MPEG-TS directo: el reproductor web no lo soporta',
    };
  }
  return { streamStatus: 'offline', lastStreamError: 'Formato de stream no reconocido' };
}

/** Format verdicts are not network blips: retrying or waiting will not change them. */
export function isFormatVerdict(result) {
  return /^Formato /.test(result.lastStreamError ?? '');
}

/**
 * Hysteresis: one bad run must not hide a channel for 6 h. A failure is
 * retried once within the run; the channel only becomes OFFLINE after
 * OFFLINE_AFTER_FAILURES consecutive failed runs (format problems at once).
 */
export function nextChannelState(previousStatus, previousFailures, result) {
  if (result.streamStatus === 'online') return { status: 'ONLINE', failures: 0 };
  const failures = (previousFailures ?? 0) + 1;
  if (isFormatVerdict(result) || failures >= OFFLINE_AFTER_FAILURES) {
    return { status: 'OFFLINE', failures };
  }
  return {
    status: previousStatus === 'OFFLINE' ? 'OFFLINE' : previousStatus || 'UNKNOWN',
    failures,
  };
}
