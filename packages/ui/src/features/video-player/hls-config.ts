import type { HlsConfig } from 'hls.js';

/** How many fragments to keep warmed ahead of the playhead. */
export const HLS_PREFETCH_SEGMENTS = 3;

/**
 * Assumed VOD fragment duration when the playlist is not parsed yet.
 * Real HLS segments are typically 4-10s; 10s is the conservative end so
 * time-based hls.js buffers still cover at least 3 fragments.
 */
export const HLS_ASSUMED_SEGMENT_SECONDS = 10;

export const HLS_TARGET_FORWARD_BUFFER_SECONDS =
  HLS_PREFETCH_SEGMENTS * HLS_ASSUMED_SEGMENT_SECONDS;

/** 180MB holds ~3 fragments of a ~50Mbps 10s encode, which default 60MB does not. */
export const HLS_MAX_BUFFER_SIZE_BYTES = 180 * 1000 * 1000;

export function createVodHlsConfig(): Partial<HlsConfig> {
  return {
    enableWorker: true,
    startFragPrefetch: true,
    maxBufferLength: HLS_TARGET_FORWARD_BUFFER_SECONDS,
    maxMaxBufferLength: HLS_TARGET_FORWARD_BUFFER_SECONDS * 2,
    maxBufferSize: HLS_MAX_BUFFER_SIZE_BYTES,
    maxBufferHole: 0.5,
    manifestLoadingMaxRetry: 4,
    levelLoadingMaxRetry: 4,
    fragLoadingMaxRetry: 6,
    // A 5MB first segment on the home tunnel can take longer than the 20s default.
    fragLoadingTimeOut: 60_000,
  };
}

export function nextHlsSegmentUrls(
  urls: string[],
  currentIndex: number,
  count = HLS_PREFETCH_SEGMENTS
): string[] {
  if (count <= 0 || urls.length === 0) return [];
  const from = currentIndex < 0 ? 0 : currentIndex + 1;
  return urls.slice(from, from + count);
}

export function parseHlsPlaylist(
  content: string,
  baseUrl: string
): { isMaster: boolean; urls: string[]; durations: number[] } {
  const isMaster = /#EXT-X-STREAM-INF/i.test(content);
  const urls: string[] = [];
  const durations: number[] = [];
  let pendingDuration: number | null = null;

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const value = Number(line.slice('#EXTINF:'.length).split(',')[0]);
      pendingDuration = Number.isFinite(value) ? value : null;
      continue;
    }

    if (line.startsWith('#')) continue;

    try {
      urls.push(new URL(line, baseUrl).href);
      durations.push(pendingDuration ?? HLS_ASSUMED_SEGMENT_SECONDS);
      pendingDuration = null;
    } catch {
      pendingDuration = null;
    }
  }

  return { isMaster, urls, durations };
}

export function prefetchHlsFragmentUrls(
  urls: string[],
  opts?: { signal?: AbortSignal; warmed?: Set<string> }
): void {
  const warmed = opts?.warmed;
  const signal = opts?.signal;

  for (const url of urls) {
    if (!url) continue;
    if (warmed?.has(url)) continue;
    warmed?.add(url);
    void fetch(url, { credentials: 'include', cache: 'force-cache', signal }).catch(() => {
      warmed?.delete(url);
    });
  }
}
